const InterviewSession = require('../models/InterviewSession');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Score = require('../models/Score');
const Feedback = require('../models/Feedback');
const aiService = require('./aiService');

function serializeSession(session) {
  return {
    id: session._id,
    purpose: session.purpose,
    difficulty: session.difficulty,
    adaptiveDifficulty: session.adaptiveDifficulty ?? true,
    level: session.level,
    durationLabel: session.durationLabel,
    durationMinutes: session.durationMinutes,
    deadlineAt: session.deadlineAt,
    mode: session.mode,
    materials: session.materials,
    totalQuestions: session.totalQuestions,
    currentQuestionIndex: session.currentQuestionIndex,
    status: session.status,
    timedOut: session.timedOut || false,
    completionRate: session.completionRate,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
  };
}

function serializeQuestion(question) {
  return {
    id: question._id,
    index: question.index,
    text: question.text,
    category: question.category,
    difficulty: question.difficulty,
    source: question.source,
  };
}

function serializeScore(score) {
  return {
    technicalAccuracy: score.technicalAccuracy,
    structuralFlow: score.structuralFlow,
    communication: score.communication,
    confidence: score.confidence,
    relevance: score.relevance,
    overall: score.overall,
    percentage: score.overall,
    correctness: score.correctness ?? null,
    completeness: score.completeness ?? null,
    aiFeedback: score.aiFeedback,
    suggestedAnswer: score.suggestedAnswer,
    strengths: score.strengths || [],
    weaknesses: score.weaknesses || [],
    missingPoints: score.missingPoints || [],
    improvementSuggestions: score.improvementSuggestions || [],
    evidenceFromDocument: score.evidenceFromDocument || [],
    performanceImpact: score.performanceImpact || 'neutral',
    source: score.source,
  };
}

function serializeFeedback(feedback) {
  return {
    overallScore: feedback.overallScore,
    overallPercentage: feedback.overallPercentage,
    categoryScores: feedback.categoryScores,
    weightedScores: feedback.weightedScores,
    assessment: feedback.assessment,
    strengths: feedback.strengths,
    improvements: feedback.improvements,
    totalQuestions: feedback.totalQuestions ?? null,
    answeredQuestions: feedback.answeredQuestions ?? null,
    missedQuestions: feedback.missedQuestions ?? 0,
    answeredAverage: feedback.answeredAverage ?? null,
    timedOut: feedback.timedOut || false,
    source: feedback.source,
  };
}

function serializePracticeAttempt(attempt) {
  return {
    id: attempt._id,
    questionId: attempt.question,
    text: attempt.text,
    technicalAccuracy: attempt.technicalAccuracy,
    structuralFlow: attempt.structuralFlow,
    communication: attempt.communication,
    confidence: attempt.confidence,
    relevance: attempt.relevance,
    overall: attempt.overall,
    correctness: attempt.correctness ?? null,
    completeness: attempt.completeness ?? null,
    aiFeedback: attempt.aiFeedback,
    suggestedAnswer: attempt.suggestedAnswer,
    strengths: attempt.strengths || [],
    weaknesses: attempt.weaknesses || [],
    missingPoints: attempt.missingPoints || [],
    improvementSuggestions: attempt.improvementSuggestions || [],
    previousOverall: attempt.previousOverall,
    source: attempt.source,
    createdAt: attempt.createdAt,
  };
}

// Builds the per-question review list (question + answer + score) for a
// completed (or in-progress) session, ordered by question index. Questions
// that haven't been answered yet simply have answer/score set to null.
async function buildBreakdown(sessionId) {
  const questions = await Question.find({ session: sessionId }).sort({ index: 1 });
  const questionIds = questions.map((q) => q._id);

  const [answers, scores] = await Promise.all([
    Answer.find({ question: { $in: questionIds } }),
    Score.find({ question: { $in: questionIds } }),
  ]);

  const answerByQuestion = new Map(answers.map((a) => [String(a.question), a]));
  const scoreByQuestion = new Map(scores.map((s) => [String(s.question), s]));

  return questions.map((question) => {
    const answer = answerByQuestion.get(String(question._id)) || null;
    const score = scoreByQuestion.get(String(question._id)) || null;

    return {
      questionId: question._id,
      index: question.index,
      questionText: question.text,
      category: question.category,
      difficulty: question.difficulty,
      status: answer ? (score ? 'answered' : 'unscored') : question.skippedAt ? 'skipped' : 'unanswered',
      answerText: answer ? answer.text : null,
      responseDurationSeconds: answer ? answer.responseDurationSeconds : null,
      mediaMetrics: answer ? answer.mediaMetrics : null,
      score: score ? serializeScore(score) : null,
      missedGuidance: !answer
        ? {
            aiFeedback: question.missedAiFeedback || '',
            suggestedAnswer: question.missedSuggestedAnswer || '',
          }
        : null,
    };
  });
}

const avgOf = (rows, key) =>
  rows.length ? Math.round(rows.reduce((acc, r) => acc + Number(r[key] || 0), 0) / rows.length) : 0;

// Honest, deterministic summary built ONLY from real per-answer scores. Used
// if no AI provider can write the narrative at the very end of an interview,
// so a finished interview is never lost because of a provider outage.
function computedFeedback(scores) {
  const overall = avgOf(scores, 'overall');
  const strengths = [...new Set(scores.flatMap((s) => s.strengths || []))].slice(0, 3);
  const improvements = [
    ...new Set(scores.flatMap((s) => [...(s.missingPoints || []), ...(s.weaknesses || [])])),
  ].slice(0, 4);
  return {
    assessment: `The AI summary service was unavailable when this interview ended, so this summary is built directly from your per-answer evaluations (average ${overall}% on answered questions). Open each question below for the full AI evaluation.`,
    strengths,
    improvements: improvements.length ? improvements : ['Review the per-question evaluations below.'],
    source: 'fallback',
  };
}

function aggregate(scores) {
  const communication = avgOf(scores, 'communication');
  const technical = avgOf(scores, 'technicalAccuracy');
  const delivery = avgOf(scores, 'confidence');
  const relevance = avgOf(scores, 'relevance');
  const flow = avgOf(scores, 'structuralFlow');
  const weighted = {
    knowledge: technical,
    communication,
    behavioral: delivery,
    interviewPerformance: Math.round((relevance + flow) / 2),
  };
  return {
    overallScore: avgOf(scores, 'overall'),
    categoryScores: {
      communication,
      technicalKnowledge: technical,
      confidence: delivery,
      answerRelevance: relevance,
      technicalAccuracy: technical,
      structuralFlow: flow,
      deliveryPace: delivery,
    },
    weightedScores: weighted,
    overallPercentage: avgOf(scores, 'overall'),
  };
}

// Scales every headline number by answered/total so unanswered questions
// count as zero instead of being silently ignored.
function applyCompletion(data, answered, total) {
  const factor = total > 0 ? answered / total : 0;
  const scale = (n) => Math.round(Number(n || 0) * factor);
  const mapObj = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, scale(v)]));
  return {
    ...data,
    overallScore: scale(data.overallScore),
    overallPercentage: scale(data.overallPercentage),
    categoryScores: mapObj(data.categoryScores),
    weightedScores: mapObj(data.weightedScores),
  };
}

// Marks a session completed (if not already) and ensures a Feedback
// document exists for it. Unanswered questions are counted as missed, never
// as answered, and reduce the overall score accordingly.
async function finalizeSession(session, { timedOut = false } = {}) {
  const [scores, answers] = await Promise.all([
    Score.find({ session: session._id }).sort({ createdAt: 1 }),
    Answer.find({ session: session._id }),
  ]);
  const total = session.totalQuestions;
  const answered = scores.length;
  const missed = Math.max(0, total - answered);
  const wasTimedOut = timedOut || session.timedOut || false;

  // Asked-but-unanswered questions, with why they were missed (skipped by the
  // candidate, ran out of time, or simply left unanswered).
  const askedQuestions = await Question.find({ session: session._id }).sort({ index: 1 });
  const scoredIds = new Set(scores.map((sc) => String(sc.question)));
  const answeredIds = new Set(answers.map((answer) => String(answer.question)));
  const missedQuestions = askedQuestions
    .filter((q) => !scoredIds.has(String(q._id)))
    .map((q) => ({
      index: q.index + 1,
      text: q.text,
      status: answeredIds.has(String(q._id)) ? 'unscored' : q.skippedAt ? 'skipped' : wasTimedOut ? 'timed_out' : 'unanswered',
    }));

  for (const question of askedQuestions) {
    if (scoredIds.has(String(question._id)) || answeredIds.has(String(question._id))) continue;
    if (question.missedAiFeedback?.trim() && question.missedSuggestedAnswer?.trim()) continue;

    try {
      const guidance = await aiService.generateMissedAnswerGuidance({
        questionText: question.text,
        category: question.category,
        difficulty: question.difficulty,
        purpose: session.purpose,
        type: session.type,
        level: session.level,
        documentText: session.documentText,
        documentParts: session.documentParts || [],
      });
      question.missedAiFeedback = guidance.aiFeedback;
      question.missedSuggestedAnswer = guidance.suggestedAnswer;
      await question.save();
    } catch (error) {
      console.error(`[finalizeSession] Could not generate missed-question guidance for question ${question.index + 1}:`, error.message);
    }
  }

  // Already finished: never re-run (and overwrite) the evaluation. Missing
  // question guidance above can still be retried when feedback is reopened.
  if (session.status === 'completed') {
    const existing = await Feedback.findOne({ session: session._id });
    if (existing) return existing;
  }

  let feedbackData;
  if (answered > 0) {
    const plain = scores.map((s) => s.toObject());
    const numbers = aggregate(plain);
    let narrative;
    try {
      narrative = await aiService.generateSessionFeedback({
        scores: plain,
        purpose: session.purpose,
        totalQuestions: total,
        missedCount: missed,
        missedQuestions,
        timedOut: wasTimedOut,
      });
    } catch (error) {
      console.error('[finalizeSession] AI summary unavailable, using computed summary:', error.message);
      narrative = computedFeedback(plain);
    }

    feedbackData = applyCompletion(
      {
        ...numbers,
        assessment: narrative.assessment,
        strengths: narrative.strengths,
        improvements: narrative.improvements,
        source: narrative.source,
      },
      answered,
      total
    );
    feedbackData.answeredAverage = numbers.overallScore;

    if (missed > 0) {
      feedbackData.assessment +=
        ` ${missed} of ${total} question${total === 1 ? ' was' : 's were'} not answered${wasTimedOut ? ' before time ran out' : ''} ` +
        'and count as zero in the overall score.';
      feedbackData.improvements = [
        `Complete all questions within the time limit - ${missed} went unanswered.`,
        ...(feedbackData.improvements || []),
      ].slice(0, 5);
    }
  } else {
    feedbackData = {
      overallScore: 0,
      categoryScores: {
        communication: 0,
        technicalKnowledge: 0,
        confidence: 0,
        answerRelevance: 0,
        technicalAccuracy: 0,
        structuralFlow: 0,
        deliveryPace: 0,
      },
      weightedScores: { knowledge: 0, communication: 0, behavioral: 0, interviewPerformance: 0 },
      overallPercentage: 0,
      answeredAverage: null,
      assessment: wasTimedOut
        ? 'Time ran out before any question was answered.'
        : 'No questions were answered during this session, so there is nothing to evaluate yet.',
      strengths: [],
      improvements: ['Answer at least one question to receive meaningful feedback.'],
      source: 'fallback',
    };
  }

  feedbackData.totalQuestions = total;
  feedbackData.answeredQuestions = answered;
  feedbackData.missedQuestions = missed;
  feedbackData.timedOut = wasTimedOut;

  if (session.status !== 'completed') {
    session.status = 'completed';
    session.completedAt = new Date();
    session.timedOut = timedOut;
    session.completionRate = total ? Math.round((answered / total) * 100) : 0;
    await session.save();
  }

  const feedback = await Feedback.findOneAndUpdate(
    { session: session._id },
    { session: session._id, ...feedbackData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return feedback;
}

module.exports = {
  serializeSession,
  serializeQuestion,
  serializeScore,
  serializeFeedback,
  serializePracticeAttempt,
  buildBreakdown,
  aggregate,
  finalizeSession,
};
