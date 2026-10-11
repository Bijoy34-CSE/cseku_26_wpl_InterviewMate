/**
 * Lightweight media-analysis layer for Audio / Audio+Video mode answers.
 *
 * This app never invents a signal it cannot measure. Real, observable inputs:
 *
 *  Server-derived from the transcript + measured mic-open time:
 *   - speechRate (words per minute)
 *   - fillerWordRate / fillerWordCount
 *
 *  Measured in the browser and sent with the answer (validated + clamped here):
 *   - pauseCount / longestPauseSeconds / silenceRatio  (microphone level)
 *   - movementScore                                    (video frame difference)
 *   - faceVisibleRatio                                 (only if the browser
 *                                                       supports FaceDetector)
 *
 * Anything that was not measured stays null so a consumer never mistakes an
 * absent field for "measured and zero". No emotional or psychological signal
 * is derived from any of this.
 */

const FILLER_WORDS = [
  'um', 'umm', 'uh', 'uhh', 'uh-huh', 'er', 'erm',
  'like', 'you know', 'i mean', 'sort of', 'kind of', 'basically', 'actually', 'literally', 'so yeah',
];

function countFillerWords(text) {
  const lower = ` ${text.toLowerCase()} `;
  let count = 0;
  for (const filler of FILLER_WORDS) {
    const pattern = new RegExp(`[^a-z]${filler.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}[^a-z]`, 'g');
    const matches = lower.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

const num = (v, min, max, digits = 2) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const clamped = Math.max(min, Math.min(max, v));
  const f = 10 ** digits;
  return Math.round(clamped * f) / f;
};

/**
 * @param {string} transcript
 * @param {number|null|undefined} durationSeconds measured mic-open duration
 * @param {object} [clientSignals] browser-measured signals (untrusted input)
 */
function analyzeSpokenAnswer(transcript, durationSeconds, clientSignals = {}) {
  const trimmed = (transcript || '').trim();
  const words = trimmed ? trimmed.split(/\s+/) : [];
  const wordCount = words.length;

  const fillerWordCount = wordCount > 0 ? countFillerWords(trimmed) : null;
  const fillerWordRate = wordCount > 0 ? Math.round((fillerWordCount / wordCount) * 100) / 100 : null;

  const hasReliableDuration = typeof durationSeconds === 'number' && durationSeconds >= 3;
  const speechRate = hasReliableDuration && wordCount > 0 ? Math.round(wordCount / (durationSeconds / 60)) : null;

  const c = clientSignals && typeof clientSignals === 'object' ? clientSignals : {};
  const canTrustSignals = hasReliableDuration;

  return {
    speechRate,
    fillerWordRate,
    fillerWordCount,
    pauseCount: canTrustSignals ? num(c.pauseCount, 0, 200, 0) : null,
    longestPauseSeconds: canTrustSignals ? num(c.longestPauseSeconds, 0, 600, 1) : null,
    silenceRatio: canTrustSignals ? num(c.silenceRatio, 0, 1, 2) : null,
    faceVisibleRatio: canTrustSignals ? num(c.faceVisibleRatio, 0, 1, 2) : null,
    movementScore: canTrustSignals ? num(c.movementScore, 0, 100, 0) : null,
  };
}

const EMPTY_METRICS = {
  speechRate: null,
  fillerWordRate: null,
  fillerWordCount: null,
  pauseCount: null,
  longestPauseSeconds: null,
  silenceRatio: null,
  faceVisibleRatio: null,
  movementScore: null,
};

module.exports = { analyzeSpokenAnswer, EMPTY_METRICS };
