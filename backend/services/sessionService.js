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
    type: session.type,
    difficulty: session.difficulty,
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
    source: feedback.source,
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
      answerText: answer ? answer.text : null,
      responseDurationSeconds: answer ? answer.responseDurationSeconds : null,
      mediaMetrics: answer ? answer.mediaMetrics : null,
      score: score ? serializeScore(score) : null,
    };
  });
}

// Marks a session completed (if not already) and ensures a Feedback
// document exists for it, generating one from whatever scores are on record
// (an honest "no answers" fallback if there are none at all).
async function finalizeSession(session, { timedOut = false } = {}) {
  const scores = await Score.find({ session: session._id }).sort({ createdAt: 1 });

  let feedbackData;
  if (scores.length > 0) {
    feedbackData = await aiService.generateSessionFeedback({
      scores: scores.map((s) => s.toObject()),
      purpose: session.purpose,
      type: session.type,
    });
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
      assessment: timedOut
        ? 'Time ran out before any question was answered.'
        : 'No questions were answered during this session, so there is nothing to evaluate yet.',
      strengths: [],
      improvements: ['Answer at least one question to receive meaningful feedback.'],
      source: 'fallback',
    };
  }

  if (session.status !== 'completed') {
    session.status = 'completed';
    session.completedAt = new Date();
    session.timedOut = timedOut;
    // completedQuestions is however many were actually scored, regardless of
    // how the session ended - never pretend an unanswered question was answered.
    session.completionRate = Math.round((scores.length / session.totalQuestions) * 100);
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
  buildBreakdown,
  finalizeSession,
};
