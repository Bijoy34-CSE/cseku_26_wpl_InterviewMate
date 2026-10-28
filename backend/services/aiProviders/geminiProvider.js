/**
 * Real AI provider - calls the Google Gemini API (generateContent).
 *
 * Selected by aiService.js when GEMINI_API_KEY is present in the
 * environment (GEMINI_MODEL is optional - defaults to gemini-2.5-flash).
 * This is the primary provider for Mock Interview - if it fails (429, 503,
 * network or malformed response), aiService continues the SAME request on
 * the local Ollama provider; if that also fails it throws AiUnavailableError. It never falls back to the deterministic
 * fallbackProvider, which is reserved for the separate Practice feature.
 * The Gemini API key is only ever read here, server-side - it is never sent
 * to or exposed to the frontend.
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.5-flash';
const { InsufficientDocumentError } = require('../aiErrors');

function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * @param {Array<{mimeType: string, data: string}>} documentParts
 *   Optional base64 document(s) sent alongside the prompt so Gemini can read
 *   diagrams, charts, tables and slide visuals - not just extracted text.
 */
// 503 (model overloaded) is transient and worth a couple of quick retries.
// 429 (quota/rate limit) is NOT retried - hammering a rate-limited endpoint
// only makes things worse, so it fails fast with a clear retry-later error
// instead.
const GEMINI_503_MAX_RETRIES = 4;
const GEMINI_503_BACKOFF_MS = [1000, 2000, 4000, 8000]; // exponential backoff

// If the primary model keeps returning 503 (overloaded) or is unavailable,
// the same request is retried on this backup model. Set GEMINI_FALLBACK_MODEL
// in the environment to a model that exists for your key.
const DEFAULT_FALLBACK_MODEL = 'gemini-3.8-flash-lite';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(systemPrompt, userPrompt, maxTokens = 1024, documentParts = []) {
  const primary = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallback = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;

  try {
    return await callGeminiModel(primary, systemPrompt, userPrompt, maxTokens, documentParts);
  } catch (error) {
    const transient = error.status === 503 || error.status === 500 || error.status === 404;
    if (transient && fallback && fallback !== primary) {
      console.warn(`[gemini] ${primary} failed (${error.status}). Retrying on backup model ${fallback}.`);
      return callGeminiModel(fallback, systemPrompt, userPrompt, maxTokens, documentParts);
    }
    throw error;
  }
}

async function callGeminiModel(model, systemPrompt, userPrompt, maxTokens, documentParts) {
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent`;

  const parts = [
    ...documentParts.map((part) => ({
      inlineData: { mimeType: part.mimeType, data: part.data },
    })),
    { text: userPrompt },
  ];

  const body = JSON.stringify({
    contents: [{ role: 'user', parts }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
      // gemini-2.5-flash has "thinking" ON by default, and thinking tokens
      // are drawn from the SAME maxOutputTokens budget as the visible
      // response. At the low token budgets used for these short,
      // structured JSON calls, thinking alone was consuming the entire
      // budget and leaving nothing for the actual output - the model
      // would finish with finishReason: MAX_TOKENS and no text at all.
      // These calls need reliable structured output, not chain-of-thought,
      // so thinking is disabled entirely (also cheaper/faster).
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const headers = {
    'Content-Type': 'application/json',
    // The API key goes in this header, not a `?key=` query param - Google
    // now issues keys in a new "AQ." format (alongside legacy "AIzaSy...")
    // and, as of September 2026, only accepts AQ. keys via this header;
    // the query-param method 404s for them. The header works for both key
    // formats, so it's used unconditionally here.
    'x-goog-api-key': process.env.GEMINI_API_KEY,
  };

  let response;
  let attempt = 0;
  for (;;) {
    response = await fetch(url, { method: 'POST', headers, body });

    if (response.ok) break;

    if (response.status === 429) {
      // Rate-limited/quota exhausted - never retry, don't burn more quota.
      const errBody = await response.text().catch(() => '');
      const err = new Error(`Gemini is rate-limited right now (429) - please retry in a moment. ${errBody.slice(0, 200)}`);
      err.status = 429;
      throw err;
    }

    if (response.status === 503 && attempt < GEMINI_503_MAX_RETRIES) {
      await sleep(GEMINI_503_BACKOFF_MS[attempt]);
      attempt += 1;
      continue;
    }

    const errBody = await response.text().catch(() => '');
    const err = new Error(`Gemini API error (${response.status}) on ${model}: ${errBody.slice(0, 300)}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const candidate = (data.candidates || [])[0];
  const part = candidate?.content?.parts?.[0];
  const text = part?.text;

  if (!text) {
    // Most common cause: the response was cut off/blocked (finishReason
    // MAX_TOKENS / SAFETY / RECITATION) rather than a network-level failure.
    const finishReason = candidate?.finishReason || 'unknown';
    throw new Error(`Gemini API response contained no text content (finishReason: ${finishReason})`);
  }

  return text;
}

// Strips accidental markdown code fences and parses the model's JSON reply.
function parseJsonResponse(rawText) {
  const cleaned = rawText.trim().replace(/^```json\s*|^```\s*|```$/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    // Some models add extra text after the JSON. Take the first balanced {...} block.
    const start = cleaned.indexOf('{');
    if (start === -1) throw error;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
      }
    }
    throw error;
  }
}

const MAX_GROUNDING_ATTEMPTS = 3;

// Cheap deterministic backstop - catches obvious written-exam wording
// without spending an extra Gemini call. The LLM instructions above should
// already avoid this, but this is a free, reliable safety net.
const EXAM_STYLE_PATTERN =
  /\b(\d+\s*marks?|for\s+\d+\s*points?|discuss\s+in\s+detail|write\s+an?\s+essay|write\s+short\s+notes?\s+on|explain\s+in\s+detail|elaborate\s+on)\b/i;

function looksLikeExamQuestion(text) {
  if (EXAM_STYLE_PATTERN.test(text)) return true;
  // A genuine spoken viva question is short; a reproduced written-exam
  // prompt tends to run long and multi-clause.
  if (text.split(/\s+/).length > 40) return true;
  return false;
}

function buildQuestionPrompt({
  category,
  difficulty,
  purpose,
  level,
  duration,
  mode,
  materials,
  questionNumber,
  totalQuestions,
  askedTexts = [],
  previousContext = [],
  documentText,
  documentParts,
  rejectionNotes,
  directives,
}) {
  const promptLines = [
    '## Interview configuration (all of this must shape the question)',
    `Purpose: ${purpose}`,
    `Question category: ${category}`,
    `Target difficulty: ${difficulty}`,
  ];

  if (level) promptLines.push(`Candidate level: ${level}`);
  if (duration) promptLines.push(`Total interview duration: ${duration} (pace depth accordingly - a short slot means tighter, more focused questions)`);
  if (mode) {
    promptLines.push(
      `Response mode: ${mode}` +
        (/audio|video/i.test(mode)
          ? ' (the candidate answers out loud, so favour questions that can be answered verbally - avoid asking them to write out long code)'
          : ' (the candidate types their answer, so written/code-style questions are fine)')
    );
  }
  if (materials) promptLines.push(`Provided materials: ${materials}`);
  if (questionNumber && totalQuestions) {
    promptLines.push(
      `This is question ${questionNumber} of ${totalQuestions}. ` +
        (questionNumber === 1
          ? 'Open the interview at a reasonable entry point for the stated difficulty.'
          : questionNumber === totalQuestions
          ? 'This is the final question - make it a meaningful closing question.'
          : 'Build on what has already been covered.')
    );
  }

  // A PDF is sent to Gemini as the whole document (native reading, so the
  // extracted text would be redundant). DOCX/PPTX only ever contribute
  // extracted image fragments here, which carry no surrounding context on
  // their own - so for those, the extracted text and the images are both
  // included together, not treated as alternatives.
  const hasWholeDocument = documentParts.some((p) => p.mimeType === 'application/pdf');

  promptLines.push(
    '',
    '## STRICT DOCUMENT-GROUNDING RULE (this overrides everything else)',
    "The attached/extracted document below is the ONLY knowledge source you are allowed to use. " +
      'Every fact, term, system, project, or concept your question refers to MUST be explicitly present in it. ' +
      'Do not use outside knowledge, general interview clichés, or anything from your own training data - even ' +
      'if it seems related. If the document does not contain enough material for the requested category/difficulty, ' +
      'ask the most faithful question you still can using ONLY what is actually there, rather than filling the gap ' +
      'with outside knowledge.'
  );

  promptLines.push(
    '',
    '## VIVA-STYLE RULE (this is a spoken exam, not a written one)',
    'This is a LIVE VERBAL VIVA - the candidate is being asked a question out loud, not handed a written exam. ' +
      'The document may contain written exam/assignment wording (e.g. "Explain X and its types for 10 marks", ' +
      '"Discuss Y in detail"). NEVER copy that wording or ask a question that could only be answered with a long, ' +
      'essay-style, multi-paragraph response. Instead, extract the underlying concept and ask ONE short, natural, ' +
      'spoken-sounding question a real examiner would ask out loud - a definition, a "why", a "how", a comparison, ' +
      'an example, or a follow-up probing understanding. Keep it answerable in a sentence or two out loud. ' +
      'Never include mark weightings, "discuss in detail", "write an essay", or similarly worded exam instructions ' +
      'in the question text.'
  );

  if (hasWholeDocument) {
    promptLines.push(
      '',
      '## Uploaded document',
      'The document is attached to this request. Read it fully - including any diagrams, charts, tables, figures ' +
        'or slide visuals - and base your question strictly on its actual content.'
    );
  } else {
    if (documentText && documentText.trim()) {
      promptLines.push('', '## Uploaded document (extracted text)', `"""\n${documentText.slice(0, 6000)}\n"""`);
    }
    if (documentParts.length > 0) {
      promptLines.push(
        '',
        '## Uploaded document (attached images)',
        `${documentParts.length} image${documentParts.length > 1 ? 's' : ''} extracted from the document ` +
          '(diagrams/charts/figures/slide visuals) are attached to this request - base your question on them too where relevant.'
      );
    }
  }

  if (directives) promptLines.push('', directives);

  promptLines.push('', '## Session history');
  if (previousContext.length > 0) {
    promptLines.push(
      'How the candidate has answered so far (use this to adapt - if they struggled, approach the weak area ' +
        'more simply or from a different angle; if they did well, go deeper or move to a new relevant topic):'
    );
    previousContext.forEach((entry, i) => {
      promptLines.push(
        `Q${i + 1}: ${entry.question}`,
        `Answer: ${(entry.answer || '(no answer)').slice(0, 600)}`,
        `Score: ${entry.score}/100${entry.feedback ? ` - ${String(entry.feedback).slice(0, 300)}` : ''}`
      );
    });
  } else if (askedTexts.length > 0) {
    promptLines.push(`Already asked (do not repeat or closely echo these):\n- ${askedTexts.join('\n- ')}`);
  } else {
    promptLines.push('This is the first question of the session.');
  }

  if (rejectionNotes.length > 0) {
    promptLines.push(
      '',
      '## Previous attempt(s) rejected',
      'Your last attempt(s) at a question were rejected for not being strictly grounded in the document. Do not repeat this mistake:',
      ...rejectionNotes.map((note, i) => `Attempt ${i + 1} rejected: ${note}`)
    );
  }

  promptLines.push(
    '',
    'Generate exactly one new interview question that fits every configuration value above AND is strictly ' +
      'grounded in the document. Respond with ONLY a JSON object: {"text": "...", "basedOn": "<the specific fact, ' +
      'section, heading, or visual in the document this question is based on>"}.'
  );

  return promptLines.join('\n');
}

// A second, independent Gemini call that checks whether a generated question
// is actually answerable from the document alone. This is the real
// "validate before displaying" step - not a heuristic guess.
async function validateGrounding({ questionText, basedOn, documentText, documentParts }) {
  const systemPrompt =
    'You are a strict fact-checker for a live spoken viva. You will be shown a document and an interview question ' +
    'that claims to be based on it. Reject the question (grounded: false) if EITHER: (1) it is not genuinely ' +
    'answerable using ONLY information explicitly present in the document, or (2) it reads like a written exam/' +
    'assignment prompt rather than a short spoken viva question (e.g. it expects an essay-length answer, or is ' +
    'phrased as "discuss/explain in detail ..."). Respond with ONLY a JSON object: ' +
    '{"grounded": true|false, "reason": "one short sentence"}.';

  const hasWholeDocument = documentParts.some((p) => p.mimeType === 'application/pdf');
  const promptLines = [
    hasWholeDocument
      ? 'The document is attached to this request.'
      : documentText && documentText.trim()
      ? `Document text:\n"""\n${documentText.slice(0, 6000)}\n"""`
      : `${documentParts.length} image(s) extracted from the document are attached to this request.`,
    '',
    `Question: ${questionText}`,
    `Claimed basis in the document: ${basedOn || '(none given)'}`,
    '',
    'Is this question genuinely answerable strictly from the document above?',
  ];

  // Provider failures (429 / 5xx / network) say nothing about the document:
  // let them propagate so aiService can continue on Ollama.
  const raw = await callGemini(systemPrompt, promptLines.join('\n'), 150, documentParts);

  try {
    const parsed = parseJsonResponse(raw);
    return { grounded: parsed.grounded === true, reason: parsed.reason || '' };
  } catch (error) {
    return { grounded: false, reason: `Validator returned unreadable output: ${error.message}` };
  }
}

async function generateQuestion(params) {
  const { documentText, documentParts = [] } = params;
  const rejectionNotes = [];

  for (let attempt = 1; attempt <= MAX_GROUNDING_ATTEMPTS; attempt++) {
    const prompt = buildQuestionPrompt({ ...params, documentParts, rejectionNotes });
    const systemPrompt =
      'You are an expert interviewer conducting a live, adaptive interview, strictly grounded in a candidate-' +
      "supplied document. You generate ONE question at a time. Respond with ONLY a JSON object of the form " +
      '{"text": "...", "basedOn": "..."} - no markdown, no explanation, no code fences.';

    const raw = await callGemini(systemPrompt, prompt, 400, documentParts);
    const parsed = parseJsonResponse(raw);
    if (!parsed.text || typeof parsed.text !== 'string') {
      throw new Error('Gemini question response missing "text" field');
    }

    if (looksLikeExamQuestion(parsed.text)) {
      rejectionNotes.push(`"${parsed.text}" - this reproduces written-exam/essay wording, not a short spoken viva question`);
      continue;
    }

    const { grounded, reason } = await validateGrounding({
      questionText: parsed.text,
      basedOn: parsed.basedOn,
      documentText,
      documentParts,
    });

    if (grounded) {
      return { text: parsed.text.trim(), source: 'ai' };
    }

    rejectionNotes.push(`"${parsed.text}" - ${reason || 'not supported by the document'}`);
  }

  throw new InsufficientDocumentError(
    'The uploaded document does not contain enough information to generate a question that fits this configuration. ' +
      'Try a different/more detailed document, or adjust the interview settings.'
  );
}

async function scoreAnswer({ questionText, answerText, category, difficulty, level, mode, documentText, documentParts = [], directives, standalonePractice, unanswered = false }) {
  const systemPrompt =
    "You are an expert interview evaluator conducting a live viva. Score the candidate's answer honestly and " +
    (standalonePractice
      ? 'constructively, judging it against accurate general subject knowledge and the question; no uploaded document is provided. '
      : 'constructively, judging it strictly against the uploaded document and the question - not generic expectations. ') +
    'Respond with ONLY a JSON object with this exact shape: ' +
    '{"technicalAccuracy":0,"structuralFlow":0,"communication":0,"deliveryQuality":0,"relevance":0,' +
    '"correctness":0,"completeness":0,' +
    '"strengths":["..."],"weaknesses":["..."],"missingPoints":["..."],"improvementSuggestions":["..."],' +
    '"evidenceFromDocument":["..."],"performanceImpact":"positive|neutral|negative",' +
    '"aiFeedback":"...","suggestedAnswer":"..."} ' +
    'All score fields are integers 0-100. deliveryQuality is an observable answer-delivery quality score only; it must never represent psychological confidence. strengths/weaknesses/missingPoints/improvementSuggestions are each 1-3 ' +
    'short bullet points specific to THIS answer - never reuse generic phrasing across different answers. ' +
    'evidenceFromDocument lists the specific document passages/facts used to judge this answer (1-3 short items). ' +
    'performanceImpact is how this answer should influence the difficulty of the NEXT question: "positive" if the ' +
    'candidate should be challenged more, "negative" if the next question should be simpler/more foundational, ' +
    '"neutral" otherwise. No markdown, no explanation outside the JSON.';

  const promptLines = [
    `Category: ${category}`,
    `Difficulty: ${difficulty}`,
    ...(level ? [`Candidate level: ${level} (grade against what is fair to expect at this level)`] : []),
    ...(directives ? ['', directives, ''] : []),
    `Question: ${questionText}`,
    `Candidate's answer: ${answerText || '(no answer provided)'}`,
    ...(unanswered ? ['The candidate did not submit an answer. Do not pretend they gave an answer or attribute mistakes or strengths to them. State that no answer was submitted, provide a useful learning focus, and write a strong model answer grounded in the uploaded document.'] : []),
  ];

  const hasWholeDocument = documentParts.some((p) => p.mimeType === 'application/pdf');
  if (hasWholeDocument) {
    promptLines.push(
      'The candidate\'s uploaded document is attached to this request - judge correctness/relevance/completeness ' +
        'strictly against what it actually contains, and list any relevant points from it the candidate missed.'
    );
  } else if (documentText && documentText.trim()) {
    promptLines.push(
      "For context, here is the candidate's uploaded document - judge correctness/relevance/completeness against " +
        'it, and list any relevant points from it the candidate missed:',
      `"""\n${documentText.slice(0, 4000)}\n"""`
    );
  }

  promptLines.push(
    (unanswered
      ? 'For this unanswered question, write brief AI feedback that clearly notes no answer was submitted and gives a useful learning focus, then provide a strong model answer grounded in the uploaded document as suggestedAnswer. Do not describe these values as an evaluation of a submitted answer.'
      : 'Evaluate the answer across the five score dimensions, list specific strengths/weaknesses/missing points for THIS answer, write a short constructive critique (aiFeedback), and provide a strong model answer (suggestedAnswer).') +
      (standalonePractice ? ' Do not claim document evidence; use an empty evidenceFromDocument list.' : '')
  );

  const raw = await callGemini(systemPrompt, promptLines.join('\n'), 800, documentParts);
  const parsed = parseJsonResponse(raw);

  const requiredNumberFields = ['technicalAccuracy', 'structuralFlow', 'communication', 'deliveryQuality', 'relevance'];
  for (const field of requiredNumberFields) {
    if (typeof parsed[field] !== 'number') {
      throw new Error(`Gemini score response missing numeric field "${field}"`);
    }
  }
  if (typeof parsed.aiFeedback !== 'string' || typeof parsed.suggestedAnswer !== 'string') {
    throw new Error('Gemini score response missing aiFeedback/suggestedAnswer');
  }

  const asStringArray = (val) => (Array.isArray(val) ? val.filter((v) => typeof v === 'string') : []);

  const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
  const overall = Math.round(
    (parsed.technicalAccuracy + parsed.structuralFlow + parsed.communication + parsed.deliveryQuality + parsed.relevance) / 5
  );
  const validImpacts = ['positive', 'neutral', 'negative'];

  return {
    technicalAccuracy: clamp(parsed.technicalAccuracy),
    structuralFlow: clamp(parsed.structuralFlow),
    communication: clamp(parsed.communication),
    // Keep the existing database/UI field for backward compatibility, but store
    // observable delivery quality only; never a psychological confidence judgement.
    confidence: clamp(parsed.deliveryQuality),
    relevance: clamp(parsed.relevance),
    correctness: typeof parsed.correctness === 'number' ? clamp(parsed.correctness) : null,
    completeness: typeof parsed.completeness === 'number' ? clamp(parsed.completeness) : null,
    overall: clamp(overall),
    strengths: asStringArray(parsed.strengths),
    weaknesses: asStringArray(parsed.weaknesses),
    missingPoints: asStringArray(parsed.missingPoints),
    improvementSuggestions: asStringArray(parsed.improvementSuggestions),
    evidenceFromDocument: asStringArray(parsed.evidenceFromDocument),
    performanceImpact: validImpacts.includes(parsed.performanceImpact) ? parsed.performanceImpact : 'neutral',
    aiFeedback: parsed.aiFeedback,
    suggestedAnswer: parsed.suggestedAnswer,
    source: 'ai',
  };
}

async function generateSessionFeedback({ scores, purpose, missedQuestions = [], totalQuestions, missedCount = 0, timedOut = false }) {
  const systemPrompt =
    'You are an expert interview coach summarizing a completed mock interview session. ' +
    'Respond with ONLY a JSON object of this exact shape: ' +
    '{"assessment":"...","strengths":["...","..."],"improvements":["...","..."]} ' +
    'No markdown, no explanation outside the JSON. Keep the assessment to 2-3 sentences, and provide 2-4 short strengths and improvements.';

  const scoreSummary = scores
    .map((s, i) => `Q${i + 1}: overall ${s.overall}, technicalAccuracy ${s.technicalAccuracy}, structuralFlow ${s.structuralFlow}, communication ${s.communication}, deliveryQuality ${s.confidence}, relevance ${s.relevance}`)
    .join('\n');

  const userPrompt = [
    `Interview purpose: ${purpose}`,
    ...(totalQuestions ? [`Questions planned: ${totalQuestions}. Answered: ${scores.length}. Not answered: ${missedCount}${timedOut ? ' (the interview timed out)' : ''}. Never describe unanswered questions as answered. Do not comment on personality or psychological state.`] : []),
    'Per-question scores:',
    scoreSummary || 'No scored answers.',
    'Missed questions (these were not answered and must not be treated as answered):',
    missedQuestions.length
      ? missedQuestions.map((q) => `Q${q.index}: status=${q.status}, question=${q.text}`).join('\n')
      : 'None.',
    'Write an overall assessment paragraph plus lists of strengths and areas to improve. Explicitly account for missed questions when they exist.',
  ].join('\n');

  const raw = await callGemini(systemPrompt, userPrompt, 500);
  const parsed = parseJsonResponse(raw);

  if (typeof parsed.assessment !== 'string' || !Array.isArray(parsed.strengths) || !Array.isArray(parsed.improvements)) {
    throw new Error('Gemini session feedback response has an unexpected shape');
  }

  const avg = (key) => (scores.length > 0 ? Math.round(scores.reduce((acc, s) => acc + s[key], 0) / scores.length) : 0);
  const categoryScores = {
    communication: avg('communication'),
    technicalKnowledge: avg('technicalAccuracy'),
    // Legacy field name; the value represents observable delivery quality.
    confidence: avg('confidence'),
    answerRelevance: avg('relevance'),
    technicalAccuracy: avg('technicalAccuracy'),
    structuralFlow: avg('structuralFlow'),
    deliveryPace: avg('confidence'),
  };
  const overallScore = avg('overall');

  // Transparent weighted dimensions - all four are derived from the same
  // per-answer evaluation Gemini already produces in every mode, so nothing
  // is zeroed out just because this was a Text Only session.
  const knowledge = avg('technicalAccuracy');
  const communication = avg('communication');
  const behavioral = avg('confidence'); // observable delivery quality only; never psychological confidence
  const interviewPerformance = Math.round((avg('relevance') + avg('structuralFlow')) / 2);
  const weightedScores = { knowledge, communication, behavioral, interviewPerformance };
  const overallPercentage = Math.round(knowledge * 0.4 + communication * 0.2 + behavioral * 0.2 + interviewPerformance * 0.2);

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
