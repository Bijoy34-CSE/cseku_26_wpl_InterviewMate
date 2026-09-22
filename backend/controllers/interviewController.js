const mongoose = require('mongoose');
const InterviewSession = require('../models/InterviewSession');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Score = require('../models/Score');
const Feedback = require('../models/Feedback');
const aiService = require('../services/aiService');
const adaptiveEngine = require('../services/adaptiveEngine');
const documentService = require('../services/documentService');
const mediaAnalysisService = require('../services/mediaAnalysisService');
const { InsufficientDocumentError, AiUnavailableError } = require('../services/aiErrors');
const {
  serializeSession,
  serializeQuestion,
  serializeScore,
  serializeFeedback,
  finalizeSession,
} = require('../services/sessionService');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

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

// POST /api/interview/sessions
exports.createSession = async (req, res) => {
  try {
    if (!aiService.isRealAiConfigured()) {
      return res.status(503).json({
        message:
          'AI evaluation is not configured on this server, so a real document-grounded interview cannot be generated. ' +
          'Set GEMINI_API_KEY in backend/.env and restart the server.',
      });
    }

    const { purpose, customPurpose, type, difficulty, level, duration, questions, mode, materials } = req.body;

    if (!purpose || !type || !difficulty || !questions) {
      return res.status(400).json({ message: 'purpose, type, difficulty and questions are required' });
    }

    if (!adaptiveEngine.DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({ message: `difficulty must be one of: ${adaptiveEngine.DIFFICULTIES.join(', ')}` });
    }

    const totalQuestions = parseInt(questions, 10);
    if (!totalQuestions || totalQuestions < 1) {
      return res.status(400).json({ message: 'questions must resolve to a positive number' });
    }

    // The Mock Interview is strictly document-grounded: every question must
    // come from the candidate's own uploaded material, never generic/model
    // knowledge - so a document is mandatory, not optional context.
    if (!req.file) {
      return res.status(400).json({
        message: 'A document (PDF, DOCX, or PPTX) is required to start this interview - questions are generated strictly from its content.',
      });
    }

    const resolvedPurpose = customPurpose && customPurpose.trim() ? customPurpose.trim() : purpose;

    // Extract the uploaded document's content now so the AI provider can
    // ground every generated question in it.
    let documentText = null;
    let documentParts = [];
    let resolvedMaterials = materials || null;

    try {
      documentText = await documentService.extractText(req.file);
      // PDFs are forwarded to Gemini as-is (diagrams/charts/tables and all);
      // DOCX/PPTX contribute their embedded images individually.
      documentParts = await documentService.buildDocumentParts(req.file);

      if (!documentText && documentParts.length === 0) {
        return res.status(400).json({
          message: 'No readable text or images could be extracted from the uploaded file. Please try a different document.',
        });
      }

      resolvedMaterials = req.file.originalname;
    } catch (extractError) {
      return res.status(400).json({ message: extractError.message });
    }

    // Parse "15 Mins" -> 15. Falls back to no deadline if unparseable, so a
    // session is never accidentally created already-expired.
    const durationMatch = String(duration || '').match(/\d+/);
    const durationMinutes = durationMatch ? parseInt(durationMatch[0], 10) : null;
    const startedAt = new Date();
    const deadlineAt = durationMinutes ? new Date(startedAt.getTime() + durationMinutes * 60 * 1000) : null;

    const session = await InterviewSession.create({
      user: req.user._id,
      purpose: resolvedPurpose,
      type,
      difficulty,
      level,
      durationLabel: duration,
      durationMinutes,
      startedAt,
      deadlineAt,
      mode,
      materials: resolvedMaterials,
      documentText,
      documentParts,
      totalQuestions,
      currentQuestionIndex: 0,
      status: 'in_progress',
    });

    const category = aiService.resolveCategoryBucket(type);
    const generated = await aiService.generateQuestion({
      category,
      difficulty,
      purpose: resolvedPurpose,
      type,
      level,
      duration,
      mode,
      materials: resolvedMaterials,
      questionNumber: 1,
      totalQuestions,
      askedTexts: [],
      previousContext: [],
      documentText,
      documentParts,
    });

    const question = await Question.create({
      session: session._id,
      index: 0,
      text: generated.text,
      category,
      difficulty,
      source: generated.source,
    });

    res.status(201).json({
      session: serializeSession(session),
      question: serializeQuestion(question),
    });
  } catch (error) {
    if (error instanceof InsufficientDocumentError) {
      return res.status(422).json({ message: error.message });
    }
    if (error instanceof AiUnavailableError) {
      return res.status(503).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

// GET /api/interview/sessions/:id
exports.getSession = async (req, res) => {
  try {
    const session = await loadOwnedSession(req, res);
    if (!session) return;

    let currentQuestion = null;
    if (session.status === 'in_progress') {
      currentQuestion = await Question.findOne({ session: session._id, index: session.currentQuestionIndex });
    }

    res.status(200).json({
      session: serializeSession(session),
      currentQuestion: currentQuestion ? serializeQuestion(currentQuestion) : null,
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
      return serialized;
    });

    res.status(200).json({ sessions: enriched });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/interview/sessions/:id/answers
exports.submitAnswer = async (req, res) => {
  try {
    if (!aiService.isRealAiConfigured()) {
      return res.status(503).json({
        message: 'AI evaluation is not configured on this server. Set GEMINI_API_KEY in backend/.env and restart the server.',
      });
    }

    const session = await loadOwnedSession(req, res);
    if (!session) return;

    if (session.status !== 'in_progress') {
      return res.status(400).json({ message: 'This interview session has already been completed' });
    }

    // Authoritative server-side deadline check - the frontend's countdown is
    // just a display and is never trusted for enforcement. Time already up
    // means this answer is rejected and the session is finalized as timed out.
    if (session.deadlineAt && Date.now() > session.deadlineAt.getTime()) {
      const feedback = await finalizeSession(session, { timedOut: true });
      return res.status(200).json({
        completed: true,
        timedOut: true,
        session: serializeSession(session),
        feedback: serializeFeedback(feedback),
      });
    }

    const { questionId, text, responseDurationSeconds } = req.body;
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

    const existingAnswer = await Answer.findOne({ question: question._id });
    if (existingAnswer) {
      return res.status(400).json({ message: 'This question has already been answered' });
    }

    const trimmedText = text.trim();
    const wordCount = trimmedText ? trimmedText.split(/\s+/).length : 0;

    // Only genuinely measurable signals - see mediaAnalysisService.js for
    // exactly what is (and deliberately is not) derived here.
    const durationSeconds = typeof responseDurationSeconds === 'number' && responseDurationSeconds > 0 ? responseDurationSeconds : null;
    const mediaMetrics = mediaAnalysisService.analyzeSpokenAnswer(trimmedText, durationSeconds);

    const answer = await Answer.create({
      session: session._id,
      question: question._id,
      text: trimmedText,
      wordCount,
      responseDurationSeconds: durationSeconds,
      mediaMetrics,
    });

    const sessionDocumentParts = session.documentParts || [];

    const scored = await aiService.scoreAnswer({
      questionText: question.text,
      answerText: trimmedText,
      category: question.category,
      difficulty: question.difficulty,
      level: session.level,
      mode: session.mode,
      documentText: session.documentText,
      documentParts: sessionDocumentParts,
      mediaMetrics,
    });

    const score = await Score.create({
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

    session.currentQuestionIndex += 1;

    // Session finished
    if (session.currentQuestionIndex >= session.totalQuestions) {
      const feedback = await finalizeSession(session);
      return res.status(200).json({
        completed: true,
        score: serializeScore(score),
        session: serializeSession(session),
        feedback: serializeFeedback(feedback),
      });
    }

    // Otherwise, generate the next (adaptive) question
    const nextDifficulty = adaptiveEngine.nextDifficulty(question.difficulty, score.overall);
    session.difficulty = nextDifficulty;
    await session.save();

    const askedTexts = (await Question.find({ session: session._id }).select('text')).map((q) => q.text);
    const category = aiService.resolveCategoryBucket(session.type);

    // Build the real interview context (question, answer, score, feedback) so
    // the next question adapts to how this candidate has actually performed.
    const priorQuestions = await Question.find({ session: session._id }).sort({ index: 1 });
    const priorAnswers = await Answer.find({ session: session._id });
    const priorScores = await Score.find({ session: session._id });
    const answerByQuestion = new Map(priorAnswers.map((a) => [String(a.question), a]));
    const scoreByQuestion = new Map(priorScores.map((s) => [String(s.question), s]));

    const previousContext = priorQuestions
      .filter((q) => scoreByQuestion.has(String(q._id)))
      .map((q) => ({
        question: q.text,
        answer: answerByQuestion.get(String(q._id))?.text || '',
        score: scoreByQuestion.get(String(q._id))?.overall ?? null,
        feedback: scoreByQuestion.get(String(q._id))?.aiFeedback || '',
      }));

    const generated = await aiService.generateQuestion({
      category,
      difficulty: nextDifficulty,
      purpose: session.purpose,
      type: session.type,
      level: session.level,
      duration: session.durationLabel,
      mode: session.mode,
      materials: session.materials,
      questionNumber: session.currentQuestionIndex + 1,
      totalQuestions: session.totalQuestions,
      askedTexts,
      previousContext,
      documentText: session.documentText,
      documentParts: sessionDocumentParts,
    });

    const nextQuestion = await Question.create({
      session: session._id,
      index: session.currentQuestionIndex,
      text: generated.text,
      category,
      difficulty: nextDifficulty,
      source: generated.source,
    });

    res.status(200).json({
      completed: false,
      score: serializeScore(score),
      session: serializeSession(session),
      nextQuestion: serializeQuestion(nextQuestion),
    });
  } catch (error) {
    if (error instanceof InsufficientDocumentError) {
      return res.status(422).json({ message: error.message });
    }
    if (error instanceof AiUnavailableError) {
      return res.status(503).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
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
