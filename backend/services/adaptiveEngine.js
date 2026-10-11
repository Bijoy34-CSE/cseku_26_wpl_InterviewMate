/**
 * Adaptive Engine.
 *
 * Decides how the NEXT question should differ from the last one, using the
 * real evaluation of the answer just given (score, performance impact,
 * weaknesses, missing points) plus how much of the interview is left. It is
 * deliberately rule-based (no AI call): aiService stays responsible for the
 * actual question text, and receives this plan as instructions.
 */

const DIFFICULTIES = ['Easy', 'Intermediate', 'Hard'];

const PROMOTE_THRESHOLD = 80;
const DEMOTE_THRESHOLD = 50;

function clampIndex(i) {
  return Math.max(0, Math.min(DIFFICULTIES.length - 1, i));
}

/**
 * @param {string} currentDifficulty difficulty of the question just answered
 * @param {number|null|undefined} lastOverallScore 0-100 or null
 * @param {'positive'|'neutral'|'negative'} [impact] evaluator's recommendation
 */
function nextDifficulty(currentDifficulty, lastOverallScore, impact = 'neutral') {
  const idx = DIFFICULTIES.indexOf(currentDifficulty);
  const safe = idx === -1 ? 1 : idx;

  if (lastOverallScore == null) return DIFFICULTIES[safe];

  if (lastOverallScore >= PROMOTE_THRESHOLD || (impact === 'positive' && lastOverallScore >= 72)) {
    return DIFFICULTIES[clampIndex(safe + 1)];
  }
  if (lastOverallScore < DEMOTE_THRESHOLD || (impact === 'negative' && lastOverallScore < 62)) {
    return DIFFICULTIES[clampIndex(safe - 1)];
  }
  return DIFFICULTIES[safe];
}

/**
 * Builds the adaptive plan handed to the question generator.
 * @param {object} p
 * @param {string} p.currentDifficulty
 * @param {object|null} p.lastEvaluation { overall, performanceImpact, weaknesses, missingPoints, strengths }
 * @param {number} p.remainingQuestions questions still to ask INCLUDING the next one
 */
function buildPlan({ currentDifficulty, lastEvaluation, remainingQuestions = 1 }) {
  if (!lastEvaluation) {
    return null;
  }

  const difficulty = nextDifficulty(currentDifficulty, lastEvaluation.overall, lastEvaluation.performanceImpact);
  const from = DIFFICULTIES.indexOf(currentDifficulty);
  const to = DIFFICULTIES.indexOf(difficulty);
  const strong = lastEvaluation.overall >= PROMOTE_THRESHOLD;
  const weak = lastEvaluation.overall < DEMOTE_THRESHOLD;

  let direction = 'maintain';
  let instruction =
    'The last answer was partly right. Ask a question of similar difficulty that tests a neighbouring idea from the document, or clarifies something the candidate left incomplete.';

  if (weak || to < from) {
    direction = 'simplify';
    instruction =
      'The last answer was weak. Ask a simpler, more fundamental question about the same area of the document so the candidate can rebuild from the basics. Do not repeat the previous question.';
  } else if (strong || to > from) {
    direction = 'deepen';
    instruction =
      'The last answer was strong. Ask a deeper follow-up that builds on what the candidate just said (reasoning, trade-off, "what if", or a related mechanism) using only the document.';
  }

  if (remainingQuestions <= 1) {
    instruction += ' This is the closing question: choose something that meaningfully rounds off the interview.';
  }

  return {
    direction,
    difficulty,
    instruction,
    revisit: [...(lastEvaluation.missingPoints || []), ...(lastEvaluation.weaknesses || [])].slice(0, 3),
    strengths: (lastEvaluation.strengths || []).slice(0, 2),
  };
}

module.exports = { DIFFICULTIES, nextDifficulty, buildPlan };
