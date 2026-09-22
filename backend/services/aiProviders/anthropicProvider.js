/**
 * Real AI provider - calls the Anthropic Messages API.
 *
 * This is the "plug in a real AI provider" half of the abstraction. It is
 * selected by aiService.js when ANTHROPIC_API_KEY is present in the
 * environment (ANTHROPIC_MODEL is optional - defaults to
 * claude-3-5-sonnet-20241022). Every function here makes an actual network
 * call and returns `source: 'ai'` - if the call fails or the model's
 * response can't be parsed as the expected JSON shape, it throws so the
 * caller can decide how to handle it (aiService falls back to the heuristic
 * provider rather than silently faking an AI result).
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

async function callClaude(systemPrompt, userPrompt, maxTokens = 1024) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Anthropic API error (${response.status}): ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error('Anthropic API response contained no text content');
  }

  return textBlock.text;
}

// Strips accidental markdown code fences and parses the model's JSON reply.
function parseJsonResponse(rawText) {
  const cleaned = rawText.trim().replace(/^```json\s*|^```\s*|```$/g, '').trim();
  return JSON.parse(cleaned);
}

async function generateQuestion({ category, difficulty, purpose, type, askedTexts = [] }) {
  const systemPrompt =
    'You are an expert technical and behavioral interviewer generating one interview question at a time. ' +
    'Respond with ONLY a JSON object of the form {"text": "..."} - no markdown, no explanation, no code fences.';

  const userPrompt = [
    `Interview purpose: ${purpose}`,
    `Interview type: ${type}`,
    `Question category to draw from: ${category}`,
    `Target difficulty: ${difficulty}`,
    askedTexts.length > 0
      ? `Questions already asked in this session (do not repeat these or ask something too similar):\n- ${askedTexts.join('\n- ')}`
      : 'This is the first question of the session.',
    'Generate exactly one new interview question appropriate for the category and difficulty above.',
  ].join('\n');

  const raw = await callClaude(systemPrompt, userPrompt, 300);
  const parsed = parseJsonResponse(raw);
  if (!parsed.text || typeof parsed.text !== 'string') {
    throw new Error('Anthropic question response missing "text" field');
  }
  return { text: parsed.text.trim(), source: 'ai' };
}

async function scoreAnswer({ questionText, answerText, category, difficulty }) {
  const systemPrompt =
    'You are an expert interview evaluator. Score the candidate\'s answer honestly and constructively. ' +
    'Respond with ONLY a JSON object with this exact shape (all scores are integers 0-100): ' +
    '{"technicalAccuracy":0,"structuralFlow":0,"communication":0,"confidence":0,"relevance":0,' +
    '"strengths":["..."],"weaknesses":["..."],"missingPoints":["..."],"aiFeedback":"...","suggestedAnswer":"..."} ' +
    'No markdown, no explanation outside the JSON.';

  const userPrompt = [
    `Category: ${category}`,
    `Difficulty: ${difficulty}`,
    `Question: ${questionText}`,
    `Candidate's answer: ${answerText || '(no answer provided)'}`,
    'Evaluate the answer across the five score dimensions, list 1-3 short strengths/weaknesses/missing points specific to this answer, write a short constructive critique (aiFeedback), and provide a strong model answer (suggestedAnswer).',
  ].join('\n');

  const raw = await callClaude(systemPrompt, userPrompt, 800);
  const parsed = parseJsonResponse(raw);

  const requiredNumberFields = ['technicalAccuracy', 'structuralFlow', 'communication', 'confidence', 'relevance'];
  for (const field of requiredNumberFields) {
    if (typeof parsed[field] !== 'number') {
      throw new Error(`Anthropic score response missing numeric field "${field}"`);
    }
  }
  if (typeof parsed.aiFeedback !== 'string' || typeof parsed.suggestedAnswer !== 'string') {
    throw new Error('Anthropic score response missing aiFeedback/suggestedAnswer');
  }

  const asStringArray = (val) => (Array.isArray(val) ? val.filter((v) => typeof v === 'string') : []);
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
  const overall = Math.round(
    (parsed.technicalAccuracy + parsed.structuralFlow + parsed.communication + parsed.confidence + parsed.relevance) / 5
  );

  return {
    technicalAccuracy: clamp(parsed.technicalAccuracy),
    structuralFlow: clamp(parsed.structuralFlow),
    communication: clamp(parsed.communication),
    confidence: clamp(parsed.confidence),
    relevance: clamp(parsed.relevance),
    overall: clamp(overall),
    strengths: asStringArray(parsed.strengths),
    weaknesses: asStringArray(parsed.weaknesses),
    missingPoints: asStringArray(parsed.missingPoints),
    aiFeedback: parsed.aiFeedback,
    suggestedAnswer: parsed.suggestedAnswer,
    source: 'ai',
  };
}

async function generateSessionFeedback({ scores, purpose, type }) {
  const systemPrompt =
    'You are an expert interview coach summarizing a completed mock interview session. ' +
    'Respond with ONLY a JSON object of this exact shape: ' +
    '{"assessment":"...","strengths":["...","..."],"improvements":["...","..."]} ' +
    'No markdown, no explanation outside the JSON. Keep the assessment to 2-3 sentences, and provide 2-4 short strengths and improvements.';

  const scoreSummary = scores
    .map((s, i) => `Q${i + 1}: overall ${s.overall}, technicalAccuracy ${s.technicalAccuracy}, structuralFlow ${s.structuralFlow}, communication ${s.communication}, confidence ${s.confidence}, relevance ${s.relevance}`)
    .join('\n');

  const userPrompt = [
    `Interview purpose: ${purpose}`,
    `Interview type: ${type}`,
    'Per-question scores:',
    scoreSummary,
    'Write an overall assessment paragraph plus lists of strengths and areas to improve.',
  ].join('\n');

  const raw = await callClaude(systemPrompt, userPrompt, 500);
  const parsed = parseJsonResponse(raw);

  if (typeof parsed.assessment !== 'string' || !Array.isArray(parsed.strengths) || !Array.isArray(parsed.improvements)) {
    throw new Error('Anthropic session feedback response has an unexpected shape');
  }

  const avg = (key) => (scores.length > 0 ? Math.round(scores.reduce((acc, s) => acc + s[key], 0) / scores.length) : 0);
  const categoryScores = {
    communication: avg('communication'),
    technicalKnowledge: avg('technicalAccuracy'),
    confidence: avg('confidence'),
    answerRelevance: avg('relevance'),
    technicalAccuracy: avg('technicalAccuracy'),
    structuralFlow: avg('structuralFlow'),
    deliveryPace: avg('confidence'),
  };
  const overallScore = avg('overall');

  const knowledge = avg('technicalAccuracy');
  const communicationScore = avg('communication');
  const behavioral = avg('confidence');
  const interviewPerformance = Math.round((avg('relevance') + avg('structuralFlow')) / 2);
  const weightedScores = { knowledge, communication: communicationScore, behavioral, interviewPerformance };
  const overallPercentage = Math.round(knowledge * 0.4 + communicationScore * 0.2 + behavioral * 0.2 + interviewPerformance * 0.2);

  return {
    overallScore,
    categoryScores,
    weightedScores,
    overallPercentage,
    assessment: parsed.assessment,
    strengths: parsed.strengths,
    improvements: parsed.improvements,
    source: 'ai',
  };
}

module.exports = { isConfigured, generateQuestion, scoreAnswer, generateSessionFeedback };
