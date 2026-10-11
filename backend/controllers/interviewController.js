const mongoose = require('mongoose');
const InterviewSession = require('../models/InterviewSession');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Score = require('../models/Score');
const Feedback = require('../models/Feedback');
const PracticeAttempt = require('../models/PracticeAttempt');
const aiService = require('../services/aiService');
const adaptiveEngine = require('../services/adaptiveEngine');
const documentService = require('../services/documentService');
const policy = require('../services/interviewPolicy');
const mediaAnalysisService = require('../services/mediaAnalysisService');
const { reserveInterview, releaseInterview, hasActivePremium, planStatus } = require('../services/planService');
const { InsufficientDocumentError, AiUnavailableError } = require('../services/aiErrors');
const { EMPTY_METRICS } = mediaAnalysisService;
const {
  serializeSession,
  serializeQuestion,
  serializeScore,
  serializeFeedback,
  serializePracticeAttempt,
  finalizeSession,
} = require('../services/sessionService');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const NOAI_MESSAGE =
  'No AI provider is available. Please make sure Gemini is configured or Ollama is running locally.';

// Loads a session and verifies it belongs to req.user. Sends a response and
// returns null if it doesn't exist / doesn't belong to the user, so callers
// can just `if (!session) return;`.
async function loadOwnedSession(req, res) {
  const { id } = req.params;
  if (!isValidId(id)) {
    res.status(400).json({ message: 'Invalid session id' });
    return null;
  }

  const session = await InterviewSession.findById(id);
  if (!session || String(session.user) !== String(req.user._id)) {
    res.status(404).json({ message: 'Interview session not found' });
    return null;
  }

  return session;
}

// Shared error mapping so every AI-backed endpoint reports failures the same way.
function sendAiError(res, error) {
  if (error instanceof InsufficientDocumentError) {
    return res.status(422).json({ message: error.message, code: 'INSUFFICIENT_DOCUMENT' });
  }
  if (error instanceof AiUnavailableError) {
    return res.status(error.status || 503).json({ message: error.message, code: 'AI_UNAVAILABLE', retryable: true });
  }
  return res.status(500).json({ message: error.message });
}

// Builds the real interview history (question, answer, evaluation) the
// adaptive engine and both AI providers use to choose the next question.
async function buildInterviewContext(sessionId) {
  const [questions, answers, scores] = await Promise.all([
    Question.find({ session: sessionId }).sort({ index: 1 }),
    Answer.find({ session: sessionId }),
    Score.find({ session: sessionId }),
  ]);
  const answerByQ = new Map(answers.map((a) => [String(a.question), a]));
  const scoreByQ = new Map(scores.map((sc) => [String(sc.question), sc]));

  const previousContext = questions
    .filter((q) => scoreByQ.has(String(q._id)))
    .map((q) => {
      const sc = scoreByQ.get(String(q._id));
      return {
        question: q.text,
        answer: answerByQ.get(String(q._id))?.text || '',
        score: sc.overall,
        difficulty: q.difficulty,
        feedback: sc.aiFeedback || '',
        strengths: sc.strengths || [],
        weaknesses: sc.weaknesses || [],
        missingPoints: sc.missingPoints || [],
        performanceImpact: sc.performanceImpact || 'neutral',
      };
    });

  return { askedTexts: questions.map((q) => q.text), previousContext };
}

function remainingSecondsFor(session) {
  return session.deadlineAt ? Math.max(0, Math.round((session.deadlineAt.getTime() - Date.now()) / 1000)) : null;
}

// Generates (or returns the already-generated) question at `index`. Safe to
// call again after a failure: it never creates a duplicate.
async function ensureQuestionAt(session, index, difficulty, adaptivePlan) {
  const existing = await Question.findOne({ session: session._id, index });
  if (existing) return existing;

  const { askedTexts, previousContext } = await buildInterviewContext(session._id);
  const category = aiService.resolveCategoryBucket(session.type);

  const generated = await aiService.generateQuestion({
    category,
    difficulty,
    purpose: session.purpose,
    purposeKey: session.purposeKey || session.purpose,
    type: session.type,
    level: session.level,
    duration: session.durationLabel,
    mode: session.mode,
    materials: session.materials,
    questionNumber: index + 1,
    totalQuestions: session.totalQuestions,
    remainingSeconds: remainingSecondsFor(session),
    adaptivePlan,
    askedTexts,
    previousContext,
    documentText: session.documentText,
    documentParts: session.documentParts || [],
  });

  return Question.create({
    session: session._id,
    index,
    text: generated.text,
    category,
    difficulty,
    source: generated.source,
  });
}

// POST /api/interview/sessions
exports.createSession = async (req, res) => {
  let session = null;
  let reservedUser = null;
  try {
    if (!aiService.isRealAiConfigured()) {
      return res.status(503).json({ message: NOAI_MESSAGE });
    }

    const parsed = policy.parseSetup(req.body);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }
    const setup = parsed.value;

    // The Mock Interview is strictly document-grounded: every question must
    // come from the candidate's own uploaded material.
    if (!req.file) {
      return res.status(400).json({
        message: 'A document (PDF, DOCX, or PPTX) is required to start this interview - questions are generated strictly from its content.',
      });
    }

    let documentText = null;
    let documentParts = [];
    try {
      documentText = await documentService.extractText(req.file);
      documentParts = await documentService.buildDocumentParts(req.file);

      if (!documentText && documentParts.length === 0) {
        return res.status(400).json({
          message: 'No readable text or images could be extracted from the uploaded file. Please try a different document.',
        });
      }
    } catch (extractError) {
      return res.status(400).json({ message: extractError.message });
    }

    reservedUser = await reserveInterview(req.user._id);
    if (!reservedUser) {
      const currentUser = await mongoose.model('User').findById(req.user._id);
      if (!currentUser) return res.status(401).json({ message: 'Account not found' });
      return res.status(402).json({
        message: 'You have used all 3 free interview sessions for this month. Upgrade to Premium to continue.',
        code: 'FREE_LIMIT_REACHED',
        plan: planStatus(currentUser),
      });
    }

    const startedAt = new Date();
    const deadlineAt = new Date(startedAt.getTime() + setup.durationMinutes * 60 * 1000);

    session = await InterviewSession.create({
      user: req.user._id,
      purpose: setup.resolvedPurpose,
      purposeKey: setup.purpose,
      type: setup.type,
      difficulty: setup.difficulty,
      adaptiveDifficulty: setup.adaptiveDifficulty,
      initialDifficulty: setup.difficulty,
      level: setup.level,
      durationLabel: setup.durationLabel,
      durationMinutes: setup.durationMinutes,
      startedAt,
      deadlineAt,
      mode: setup.mode,
      materials: req.file.originalname,
      documentText,
      documentParts,
      totalQuestions: setup.totalQuestions,
      currentQuestionIndex: 0,
      status: 'in_progress',
    });

    const question = await ensureQuestionAt(session, 0, setup.difficulty, null);

    res.status(201).json({
      session: serializeSession(session),
      question: serializeQuestion(question),
      plan: planStatus(reservedUser),
    });
  } catch (error) {
    // Never leave a half-created interview behind when the first question
    // could not be generated - the user simply starts again.
    if (session) {
      await Promise.all([
        Question.deleteMany({ session: session._id }),
        InterviewSession.deleteOne({ _id: session._id }),
      ]).catch(() => {});
    }
    if (reservedUser) {
      await releaseInterview(req.user._id, hasActivePremium(reservedUser)).catch((releaseError) => {
        console.error('[quota] could not release failed interview reservation:', releaseError.message);
      });
    }
    sendAiError(res, error);
  }
};

// GET /api/interview/sessions/:id
exports.getSession = async (req, res) => {
  try {
    const session = await loadOwnedSession(req, res);
    if (!session) return;

    let currentQuestion = null;
    let pendingAnswer = null;
    if (session.status === 'in_progress') {
      currentQuestion = await Question.findOne({ session: session._id, index: session.currentQuestionIndex });
      // An answer already saved for the current question means the previous
      // submit stopped partway (e.g. AI unavailable) - the client resumes it.
      if (currentQuestion) {
        const saved = await Answer.findOne({ question: currentQuestion._id });
        pendingAnswer = saved ? saved.text : null;
      }
    }

    res.status(200).json({
      session: serializeSession(session),
      currentQuestion: currentQuestion ? serializeQuestion(currentQuestion) : null,
      pendingAnswer,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/interview/sessions
exports.listSessions = async (req, res) => {
  try {
    const sessions = await InterviewSession.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    const sessionIds = sessions.map((s) => s._id);

    // Completed sessions have a Feedback doc with the real overall/category
    // scores - attach it so the frontend never has to invent a number.
    const feedbacks = await Feedback.find({ session: { $in: sessionIds } });
    const feedbackBySession = new Map(feedbacks.map((f) => [String(f.session), f]));

    const enriched = sessions.map((session) => {
      const serialized = serializeSession(session);
      const feedback = feedbackBySession.get(String(session._id));
      serialized.overallScore = feedback ? feedback.overallScore : null;
      serialized.categoryScores = feedback ? feedback.categoryScores : null;
      serialized.answeredQuestions = feedback ? feedback.answeredQuestions ?? null : null;
      serialized.missedQuestions = feedback ? feedback.missedQuestions ?? 0 : null;
      return serialized;
    });

    res.status(200).json({ sessions: enriched });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/interview/sessions/:id/answers
//
// Resume-safe: the answer, its evaluation and the next question are each
// saved as soon as they exist. If the AI is unavailable partway (for example
// Gemini AND Ollama both fail while generating the next question), the
// request returns a retryable error and re-submitting the same question
// continues from exactly where it stopped - nothing is lost or duplicated,
// and the interview, settings, answers and timer are untouched.
exports.submitAnswer = async (req, res) => {
  try {
    if (!aiService.isRealAiConfigured()) {
      return res.status(503).json({ message: NOAI_MESSAGE });
    }

    const session = await loadOwnedSession(req, res);
    if (!session) return;

    if (session.status !== 'in_progress') {
      return res.status(400).json({ message: 'This interview session has already been completed' });
    }

    // Authoritative server-side deadline: once time is up, no more answers.
    if (session.deadlineAt && Date.now() > session.deadlineAt.getTime()) {
      const feedback = await finalizeSession(session, { timedOut: true });
      return res.status(200).json({
        completed: true,
        timedOut: true,
        session: serializeSession(session),
        feedback: serializeFeedback(feedback),
      });
    }

    const { questionId, text, responseDurationSeconds, clientSignals } = req.body;
    if (!questionId || typeof text !== 'string') {
      return res.status(400).json({ message: 'questionId and text are required' });
    }
    if (!isValidId(questionId)) {
      return res.status(400).json({ message: 'Invalid questionId' });
    }

    const question = await Question.findById(questionId);
    if (!question || String(question.session) !== String(session._id)) {
      return res.status(404).json({ message: 'Question not found for this session' });
    }
    if (question.index !== session.currentQuestionIndex) {
      return res.status(400).json({ message: 'This is not the current question for this session' });
    }

    // ---- 1. Answer (kept if a later step fails) ----
    let answer = await Answer.findOne({ question: question._id });
    if (!answer) {
      const trimmedText = text.trim();
      if (!trimmedText) {
        return res.status(400).json({ message: 'Please provide an answer before submitting.' });
      }

      const durationSeconds =
        typeof responseDurationSeconds === 'number' && responseDurationSeconds > 0 ? responseDurationSeconds : null;
      const spoken = /audio|video/i.test(session.mode || '') && durationSeconds !== null;
      const mediaMetrics = spoken
        ? mediaAnalysisService.analyzeSpokenAnswer(trimmedText, durationSeconds, clientSignals)
        : { ...EMPTY_METRICS };

      answer = await Answer.create({
        session: session._id,
        question: question._id,
        text: trimmedText,
        wordCount: trimmedText.split(/\s+/).length,
        responseDurationSeconds: durationSeconds,
        inputMethod: spoken ? 'spoken' : 'typed',
        mediaMetrics,
      });
    }

    // ---- 2. Evaluation (kept if the next step fails) ----
    let score = await Score.findOne({ question: question._id });
    if (!score) {
      const spoken = answer.inputMethod === 'spoken';
      const scored = await aiService.scoreAnswer({
        questionText: question.text,
        answerText: answer.text,
        category: question.category,
        difficulty: question.difficulty,
        purpose: session.purpose,
        type: session.type,
        level: session.level,
        mode: session.mode,
        answerWasSpoken: spoken,
        documentText: session.documentText,
        documentParts: session.documentParts || [],
        mediaMetrics: { ...(answer.mediaMetrics?.toObject?.() || answer.mediaMetrics || {}), responseDurationSeconds: answer.responseDurationSeconds },
      });

      score = await Score.create({
        session: session._id,
        question: question._id,
        answer: answer._id,
        technicalAccuracy: scored.technicalAccuracy,
        structuralFlow: scored.structuralFlow,
        communication: scored.communication,
        confidence: scored.confidence,
        relevance: scored.relevance,
        overall: scored.overall,
        correctness: scored.correctness ?? null,
        completeness: scored.completeness ?? null,
        aiFeedback: scored.aiFeedback,
        suggestedAnswer: scored.suggestedAnswer,
        strengths: scored.strengths || [],
        weaknesses: scored.weaknesses || [],
        missingPoints: scored.missingPoints || [],
        improvementSuggestions: scored.improvementSuggestions || [],
        evidenceFromDocument: scored.evidenceFromDocument || [],
        performanceImpact: scored.performanceImpact || 'neutral',
        source: scored.source,
      });
    }

    const nextIndex = question.index + 1;

    // ---- 3. Finished: last question answered ----
    if (nextIndex >= session.totalQuestions) {
      session.currentQuestionIndex = nextIndex;
      await session.save();
      const feedback = await finalizeSession(session);
      return res.status(200).json({
        completed: true,
        score: serializeScore(score),
        session: serializeSession(session),
        feedback: serializeFeedback(feedback),
      });
    }

    // ---- 4. Time ran out while the answer was being evaluated ----
    // The answer that was already submitted in time counts; the remaining
    // questions are never asked and are recorded as missed.
    if (session.deadlineAt && Date.now() > session.deadlineAt.getTime()) {
      session.currentQuestionIndex = nextIndex;
      await session.save();
      const feedback = await finalizeSession(session, { timedOut: true });
      return res.status(200).json({
        completed: true,
        timedOut: true,
        score: serializeScore(score),
        session: serializeSession(session),
        feedback: serializeFeedback(feedback),
      });
    }

    // ---- 5. Adaptive next question ----
    const plan = session.adaptiveDifficulty
      ? adaptiveEngine.buildPlan({
          currentDifficulty: question.difficulty,
          lastEvaluation: score,
          remainingQuestions: session.totalQuestions - nextIndex,
        })
      : null;
    const nextDifficulty = plan ? plan.difficulty : question.difficulty;

    const nextQuestion = await ensureQuestionAt(session, nextIndex, nextDifficulty, plan);

    session.currentQuestionIndex = nextIndex;
    session.difficulty = nextQuestion.difficulty;
    await session.save();

    res.status(200).json({
      completed: false,
      score: serializeScore(score),
      adaptive: plan ? { direction: plan.direction, from: question.difficulty, to: nextQuestion.difficulty } : null,
      session: serializeSession(session),
      nextQuestion: serializeQuestion(nextQuestion),
    });
  } catch (error) {
    sendAiError(res, error);
  }
};

// POST /api/interview/sessions/:id/skip
// Skips the current question without an Answer or Score. It stays recorded as
// skipped (a missed question) in the final evaluation. Resume-safe like submit.
exports.skipQuestion = async (req, res) => {
  try {
    if (!aiService.isRealAiConfigured()) {
      return res.status(503).json({ message: NOAI_MESSAGE });
    }
    const session = await loadOwnedSession(req, res);
    if (!session) return;

    if (session.status !== 'in_progress') {
      return res.status(400).json({ message: 'This interview session has already been completed' });
    }
    if (session.deadlineAt && Date.now() > session.deadlineAt.getTime()) {
      const feedback = await finalizeSession(session, { timedOut: true });
      return res.status(200).json({ completed: true, timedOut: true, session: serializeSession(session), feedback: serializeFeedback(feedback) });
    }

    const question = await Question.findOne({ session: session._id, index: session.currentQuestionIndex });
    if (!question) return res.status(404).json({ message: 'Current question not found for this session' });
    if (await Answer.findOne({ question: question._id })) {
      return res.status(400).json({ message: 'This question has already been answered' });
    }

    if (!question.skippedAt) {
      question.skippedAt = new Date();
      await question.save();
    }

    const nextIndex = question.index + 1;
    if (nextIndex >= session.totalQuestions) {
      session.currentQuestionIndex = nextIndex;
      await session.save();
      const feedback = await finalizeSession(session);
      return res.status(200).json({ completed: true, skipped: true, session: serializeSession(session), feedback: serializeFeedback(feedback) });
    }

    // No evaluation exists for a skipped question, so difficulty is unchanged.
    const nextQuestion = await ensureQuestionAt(session, nextIndex, session.difficulty, null);
    session.currentQuestionIndex = nextIndex;
    await session.save();

    res.status(200).json({
      completed: false,
      skipped: true,
      adaptive: null,
      session: serializeSession(session),
      nextQuestion: serializeQuestion(nextQuestion),
    });
  } catch (error) {
    sendAiError(res, error);
  }
};

// POST /api/interview/sessions/:id/complete
exports.completeSession = async (req, res) => {
  try {
    const session = await loadOwnedSession(req, res);
    if (!session) return;

    const feedback = await finalizeSession(session);

    res.status(200).json({
      session: serializeSession(session),
      feedback: serializeFeedback(feedback),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/interview/sessions/:id/questions/:questionId/practice-again
// Re-attempts a single question from a completed interview: same question,
// a fresh answer, scored through the exact same Gemini flow as the original
// interview (strictly document-grounded, not a generic re-grade). Stores the
// attempt separately from the original Answer/Score (which stay untouched)
// and returns a previous-vs-new comparison. Never generates a new/unrelated
// question and never uses the fallback provider.
exports.practiceAgain = async (req, res) => {
  try {
    if (!aiService.isRealAiConfigured()) {
      return res.status(503).json({
        message: NOAI_MESSAGE,
      });
    }

    const session = await loadOwnedSession(req, res);
    if (!session) return;

    if (session.status !== 'completed') {
      return res.status(400).json({ message: 'Practice Again is available once this interview session is completed' });
    }

    const { questionId } = req.params;
    const { text } = req.body;

    if (!isValidId(questionId)) {
      return res.status(400).json({ message: 'Invalid questionId' });
    }
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: 'text is required' });
    }

    const question = await Question.findById(questionId);
    if (!question || String(question.session) !== String(session._id)) {
      return res.status(404).json({ message: 'Question not found for this session' });
    }

    // Baseline to compare against: the most recent practice attempt for this
    // question if one exists, otherwise the original interview Score.
    const [originalScore, lastAttempt] = await Promise.all([
      Score.findOne({ question: question._id }),
      PracticeAttempt.findOne({ question: question._id }).sort({ createdAt: -1 }),
    ]);
    if (!originalScore) {
      return res.status(400).json({ message: 'This question was not answered in the interview, so there is no previous score to compare against.' });
    }
    const previousOverall = lastAttempt ? lastAttempt.overall : originalScore.overall;

    const trimmedText = text.trim();
    const wordCount = trimmedText.split(/\s+/).length;

    // Practice Again is typed, so no audio/video signals apply. Same question,
    // same document, same evaluation pipeline (Gemini, then Ollama on failure).
    const scored = await aiService.scorePracticeAnswer({
      questionText: question.text,
      answerText: trimmedText,
      category: question.category,
      difficulty: question.difficulty,
      purpose: session.purpose,
      type: session.type,
      level: session.level,
      mode: 'Text Response',
      answerWasSpoken: false,
      documentText: session.documentText,
      documentParts: session.documentParts || [],
      mediaMetrics: { ...EMPTY_METRICS },
    });

    const attempt = await PracticeAttempt.create({
      user: req.user._id,
      session: session._id,
      question: question._id,
      text: trimmedText,
      wordCount,
      technicalAccuracy: scored.technicalAccuracy,
      structuralFlow: scored.structuralFlow,
      communication: scored.communication,
      confidence: scored.confidence,
      relevance: scored.relevance,
      overall: scored.overall,
      correctness: scored.correctness ?? null,
      completeness: scored.completeness ?? null,
      aiFeedback: scored.aiFeedback,
      suggestedAnswer: scored.suggestedAnswer,
      strengths: scored.strengths || [],
      weaknesses: scored.weaknesses || [],
      missingPoints: scored.missingPoints || [],
      improvementSuggestions: scored.improvementSuggestions || [],
      previousOverall,
      source: scored.source,
    });

    res.status(201).json({
      question: serializeQuestion(question),
      previousScore: previousOverall,
      originalScore: originalScore.overall,
      attempt: serializePracticeAttempt(attempt),
      improved: attempt.overall > previousOverall,
      delta: attempt.overall - previousOverall,
    });
  } catch (error) {
    sendAiError(res, error);
  }
};

exports.deleteSession = async (req, res, next) => {
  try {
    const session = await loadOwnedSession(req, res);
    if (!session) return;
    await Promise.all([
      Question.deleteMany({ session: session._id }),
      Answer.deleteMany({ session: session._id }),
      Score.deleteMany({ session: session._id }),
      Feedback.deleteMany({ session: session._id }),
      PracticeAttempt.deleteMany({ session: session._id, user: req.user._id }),
      InterviewSession.deleteOne({ _id: session._id, user: req.user._id }),
    ]);
    return res.json({ message: 'Interview session and its associated records were deleted' });
  } catch (error) {
    return next(error);
  }
};

// GET /api/interview/sessions/:id/questions/:questionId/practice-attempts
// Lists every Practice Again attempt made for a single history question,
// newest first - strictly scoped to the authenticated user's own session.
exports.listPracticeAttempts = async (req, res) => {
  try {
    const session = await loadOwnedSession(req, res);
    if (!session) return;

    const { questionId } = req.params;
    if (!isValidId(questionId)) {
      return res.status(400).json({ message: 'Invalid questionId' });
    }

    const question = await Question.findById(questionId);
    if (!question || String(question.session) !== String(session._id)) {
      return res.status(404).json({ message: 'Question not found for this session' });
    }

    const attempts = await PracticeAttempt.find({ question: question._id }).sort({ createdAt: -1 });
    res.status(200).json({ attempts: attempts.map(serializePracticeAttempt) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/interview/sessions/:id/timeout - called by the frontend when its
// local countdown reaches zero (e.g. the candidate never submitted a final
// answer). Re-validates against the authoritative deadline rather than
// trusting the client's claim, so this can't be used to end a session early.
exports.timeoutSession = async (req, res) => {
  try {
    const session = await loadOwnedSession(req, res);
    if (!session) return;

    if (session.status === 'in_progress' && (!session.deadlineAt || Date.now() < session.deadlineAt.getTime())) {
      return res.status(400).json({ message: 'This interview has not timed out yet' });
    }

    const feedback = await finalizeSession(session, { timedOut: session.status === 'in_progress' });

    res.status(200).json({
      session: serializeSession(session),
      feedback: serializeFeedback(feedback),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
