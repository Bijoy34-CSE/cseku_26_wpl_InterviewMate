/**
 * Lightweight media-analysis layer for Audio / Audio+Video mode answers.
 *
 * Per the product requirement: Gemini isn't expected to calculate raw
 * audio/video metrics itself, and this app must never invent a signal it
 * can't actually measure. Today the only real, observable inputs available
 * are the spoken-answer transcript (from the browser's Web Speech API) and
 * how long the candidate had the microphone open (measured client-side).
 * From those two, exactly two signals are genuinely derivable:
 *
 *   - speechRate: words per minute
 *   - fillerWordRate / fillerWordCount: share of words that were filler words
 *
 * True audio-level signals (pause ratio, interruptions) and any video signal
 * (camera-away ratio, posture, movement) would require real audio waveform
 * analysis or computer vision that this app does not implement - those are
 * deliberately left out entirely rather than estimated, so a consumer of
 * this data never mistakes an absent field for "measured and zero".
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

/**
 * @param {string} transcript - the candidate's transcribed spoken answer
 * @param {number|null|undefined} durationSeconds - measured mic-open duration, if available
 * @returns {{speechRate: number|null, fillerWordRate: number|null, fillerWordCount: number|null}}
 */
function analyzeSpokenAnswer(transcript, durationSeconds) {
  const trimmed = (transcript || '').trim();
  const words = trimmed ? trimmed.split(/\s+/) : [];
  const wordCount = words.length;

  const fillerWordCount = wordCount > 0 ? countFillerWords(trimmed) : null;
  const fillerWordRate = wordCount > 0 ? Math.round((fillerWordCount / wordCount) * 100) / 100 : null;

  const hasReliableDuration = typeof durationSeconds === 'number' && durationSeconds >= 3; // too short to be a meaningful rate
  const speechRate = hasReliableDuration && wordCount > 0 ? Math.round(wordCount / (durationSeconds / 60)) : null;

  return { speechRate, fillerWordRate, fillerWordCount };
}

module.exports = { analyzeSpokenAnswer };
