/**
 * Adaptive Engine.
 *
 * Decides the difficulty of the NEXT question in a session based on how the
 * candidate scored on the question they just answered. This is deliberately
 * small and rule-based (not an AI call) - it's the "adaptive" layer that sits
 * on top of aiService, which stays responsible for actually generating
 * question text / scoring / feedback content.
 */

const DIFFICULTIES = ['Easy', 'Intermediate', 'Hard'];

const PROMOTE_THRESHOLD = 80; // overall score at/above this bumps difficulty up
const DEMOTE_THRESHOLD = 50; // overall score below this drops difficulty down

/**
 * @param {string} currentDifficulty - the difficulty of the question just answered
 * @param {number|null|undefined} lastOverallScore - 0-100 overall score for that answer, or null/undefined if there isn't one yet (first question)
 * @returns {string} the difficulty to use for the next question
 */
function nextDifficulty(currentDifficulty, lastOverallScore) {
  const currentIndex = DIFFICULTIES.indexOf(currentDifficulty);
  const safeIndex = currentIndex === -1 ? 1 : currentIndex; // default to Intermediate if unrecognized

  if (lastOverallScore == null) {
    return DIFFICULTIES[safeIndex];
  }

  if (lastOverallScore >= PROMOTE_THRESHOLD && safeIndex < DIFFICULTIES.length - 1) {
    return DIFFICULTIES[safeIndex + 1];
  }

  if (lastOverallScore < DEMOTE_THRESHOLD && safeIndex > 0) {
    return DIFFICULTIES[safeIndex - 1];
  }

  return DIFFICULTIES[safeIndex];
}

module.exports = { DIFFICULTIES, nextDifficulty };
