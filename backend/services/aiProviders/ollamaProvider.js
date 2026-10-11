/**
 * Ollama local AI provider.
 *
 * This provider is used as the automatic fallback for Mock Interview
 * when the primary Gemini provider is unavailable.
 *
 * IMPORTANT:
 * - This is NOT a separate Practice provider.
 * - It receives the same interview context as Gemini.
 * - It uses the local Ollama HTTP API.
 * - It returns the same response shapes expected by aiService/controllers.
 *
 * Default:
 *   http://localhost:11434
 *
 * Default model:
 *   llama3.2
 */

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.2';

function getBaseUrl() {
  return (process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function getModel() {
  return process.env.OLLAMA_MODEL || DEFAULT_MODEL;
}

function isConfigured() {
  return Boolean(getBaseUrl() && getModel());
}

function parseJsonResponse(rawText) {
  if (typeof rawText !== 'string') {
    throw new Error('Ollama returned a non-text response');
  }

  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`Ollama returned invalid JSON: ${error.message}`);
  }
}

function clamp(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(n)));
}

function stringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string').slice(0, 5)
    : [];
}

function looksLikeExamQuestion(text) {
  if (typeof text !== 'string') return true;

  const examPattern =
    /\b(\d+\s*marks?|for\s+\d+\s*points?|discuss\s+in\s+detail|write\s+an?\s+essay|write\s+short\s+notes?\s+on|explain\s+in\s+detail|elaborate\s+on)\b/i;

  if (examPattern.test(text)) {
    return true;
  }

  if (text.trim().split(/\s+/).length > 40) {
    return true;
  }

  return false;
}

function buildDocumentContext(documentText, documentParts = []) {
  const sections = [];

  if (documentText && documentText.trim()) {
    sections.push(
      'UPLOADED DOCUMENT TEXT:\n' +
        documentText.slice(0, 12000)
    );
  }

  if (documentParts.length > 0) {
    sections.push(
      `The uploaded document also contains ${documentParts.length} extracted visual part(s). ` +
        'Only use visual information if it is represented in the supplied textual context. ' +
        'Do not invent visual facts.'
    );
  }

  if (sections.length === 0) {
    return 'No document text is available.';
  }

  return sections.join('\n\n');
}

function buildQuestionPrompt(params) {
  const {
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
    documentParts = [],
    rejectionNotes = [],
    directives,
  } = params;

  const lines = [
    'You are the LOCAL FALLBACK AI for InterviewMate.',
    '',
    'Generate exactly ONE viva/interview question.',
    '',
    'STRICT RULES:',
    '1. The uploaded document is the ONLY knowledge source.',
    '2. Do not use outside knowledge.',
    '3. Do not invent facts.',
    '4. Do not generate generic interview questions.',
    '5. Do not copy written exam questions.',
    '6. The question must be short and natural for a spoken viva.',
    '7. The question must be answerable from the uploaded document.',
    '8. Do not include mark values.',
    '9. Do not use phrases such as "discuss in detail", "write an essay", or "explain in detail".',
    '',
    'INTERVIEW CONFIGURATION:',
    `Purpose: ${purpose || ''}`,
    `Question Category: ${category || ''}`,
    `Difficulty: ${difficulty || ''}`,
    `Candidate Level: ${level || ''}`,
    `Duration: ${duration || ''}`,
    `Mode: ${mode || ''}`,
    `Materials: ${materials || ''}`,
    `Question Number: ${questionNumber || ''} of ${totalQuestions || ''}`,
    '',
    buildDocumentContext(documentText, documentParts),
    '',
    ...(directives ? [directives, ''] : []),
    'PREVIOUS INTERVIEW CONTEXT:',
  ];

  if (previousContext.length > 0) {
    previousContext.forEach((entry, index) => {
      lines.push(
        `Q${index + 1}: ${entry.question || ''}`,
        `Answer: ${(entry.answer || '').slice(0, 700)}`,
        `Score: ${entry.score ?? 'N/A'}/100`,
        `Feedback: ${(entry.feedback || '').slice(0, 400)}`,
        ''
      );
    });
  } else {
    lines.push('No previous answered questions.');
  }

  if (askedTexts.length > 0) {
    lines.push(
      '',
      'QUESTIONS ALREADY ASKED - DO NOT REPEAT OR CLOSELY REPHRASE:',
      ...askedTexts.map((text) => `- ${text}`)
    );
  }

  if (rejectionNotes.length > 0) {
    lines.push(
      '',
      'PREVIOUS INVALID ATTEMPTS:',
      ...rejectionNotes.map((note) => `- ${note}`)
    );
  }

  lines.push(
    '',
    'ADAPTIVE RULE:',
    'If the candidate previously performed strongly, ask a deeper question from the document.',
    'If the candidate previously struggled, ask a simpler/fundamental question from the document.',
    'Do not leave the uploaded document topic.',
    '',
    'Return ONLY this JSON object:',
    '{"text":"short viva question","basedOn":"specific document topic/fact/section"}',
    'If the document truly contains too little material for any valid question, return {"insufficient": true} instead.'
  );

  return lines.join('\n');
}

async function callOllama(systemPrompt, userPrompt, maxTokens = 900) {
  const url = `${getBaseUrl()}/api/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getModel(),
      stream: false,
      format: 'json',
      think: false,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      options: {
        temperature: 0.2,
        num_predict: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');

    const error = new Error(
      `Ollama API error (${response.status}): ${body.slice(0, 500)}`
    );

    error.status = response.status;
    throw error;
  }

  const data = await response.json();

  const text = data?.message?.content;

  if (!text || typeof text !== 'string') {
    throw new Error('Ollama returned no usable response content');
  }

  return text;
}

async function generateQuestion(params) {
  const rejectionNotes = [];

  const systemPrompt =
    'You are an expert adaptive viva interviewer running locally through Ollama. ' +
    'You must strictly use the candidate uploaded document as the only source of knowledge. ' +
    'Never use outside knowledge. Never invent facts. ' +
    'Return only valid JSON.';

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const prompt = buildQuestionPrompt({
      ...params,
      rejectionNotes,
    });

    const raw = await callOllama(systemPrompt, prompt, 500);
    const parsed = parseJsonResponse(raw);

    if (parsed.insufficient === true) {
      const insufficient = new Error('Document does not contain enough material.');
      insufficient.code = 'INSUFFICIENT_DOCUMENT';
      throw insufficient;
    }

    const text =
      typeof parsed.text === 'string' ? parsed.text.trim() : '';

    const basedOn =
      typeof parsed.basedOn === 'string'
        ? parsed.basedOn.trim()
        : '';

    if (!text) {
      rejectionNotes.push('The model returned an empty question.');
      continue;
    }

    if (looksLikeExamQuestion(text)) {
      rejectionNotes.push(
        `Rejected because it looks like a written exam question: "${text}"`
      );
      continue;
    }

    if (!basedOn) {
      rejectionNotes.push(
        'Rejected because the response did not identify the document basis.'
      );
      continue;
    }

    return {
      text,
      source: 'ai',
    };
  }

  // A local-model formatting failure is a provider problem, not proof that the
  // document is insufficient (only an explicit {"insufficient": true} is).
  throw new Error(
    'Ollama could not generate a valid document-grounded viva question.'
  );
}

async function scoreAnswer({
  questionText,
  answerText,
  category,
  difficulty,
  level,
  mode,
  documentText,
  documentParts = [],
  directives,
  standalonePractice,
  unanswered = false,
}) {
  const systemPrompt =
    (standalonePractice
      ? 'You are an expert interview evaluator for standalone practice. Evaluate using accurate general subject knowledge and the question; no uploaded document is provided. '
      : 'You are an expert interview evaluator for a live viva. Evaluate the candidate strictly against the uploaded document and the question. Do not use outside knowledge as evidence. ') +
    (unanswered ? 'The candidate did not submit an answer. Do not pretend they gave an answer or attribute mistakes or strengths to them. Provide learning guidance and a model answer instead of evaluating a submitted response. ' : '') +
    'Do not infer anxiety, honesty, intelligence, personality, mental state, or psychological confidence. ' +
    'Return ONLY valid JSON.';

  const promptLines = [
    'Evaluate this interview answer.',
    ...(unanswered ? ['The candidate did not submit an answer. State this clearly in aiFeedback, do not attribute mistakes or strengths to them, provide a useful learning focus, and write a strong model answer grounded in the uploaded document.'] : []),
    '',
    `Category: ${category || ''}`,
    `Difficulty: ${difficulty || ''}`,
    `Candidate Level: ${level || ''}`,
    `Mode: ${mode || ''}`,
    '',
    `QUESTION:\n${questionText || ''}`,
    '',
    `CANDIDATE ANSWER:\n${answerText || '(no answer provided)'}`,
    '',
    buildDocumentContext(documentText, documentParts),
  ];

  if (directives) {
    promptLines.push('', directives);
  }

  promptLines.push(
    '',
    'Return exactly this JSON structure:',
    `{
  "technicalAccuracy": 0,
  "structuralFlow": 0,
  "communication": 0,
  "deliveryQuality": 0,
  "relevance": 0,
  "correctness": 0,
  "completeness": 0,
  "strengths": [],
  "weaknesses": [],
  "missingPoints": [],
  "improvementSuggestions": [],
  "evidenceFromDocument": [],
  "performanceImpact": "positive",
  "aiFeedback": "",
  "suggestedAnswer": ""
}`,
    '',
    'All numeric scores must be integers from 0 to 100.',
    'Keep each list short and specific.',
    'performanceImpact must be positive, neutral, or negative.',
    unanswered
      ? 'For an unanswered question, aiFeedback must clearly say that no answer was submitted and provide concise learning guidance. suggestedAnswer must give a complete, accurate model response grounded in the uploaded document.'
      : standalonePractice
        ? 'suggestedAnswer must be a strong answer based on accurate general subject knowledge; do not claim document evidence.'
        : 'suggestedAnswer must be a strong answer grounded in the uploaded document.'
  );

  const raw = await callOllama(
    systemPrompt,
    promptLines.filter(Boolean).join('\n'),
    1000
  );

  const parsed = parseJsonResponse(raw);

  const requiredFields = [
    'technicalAccuracy',
    'structuralFlow',
    'communication',
    'deliveryQuality',
    'relevance',
  ];

  for (const field of requiredFields) {
    if (typeof parsed[field] !== 'number') {
      throw new Error(
        `Ollama score response missing numeric field "${field}"`
      );
    }
  }

  if (
    typeof parsed.aiFeedback !== 'string' ||
    typeof parsed.suggestedAnswer !== 'string'
  ) {
    throw new Error(
      'Ollama score response missing aiFeedback or suggestedAnswer'
    );
  }

  const technicalAccuracy = clamp(parsed.technicalAccuracy);
  const structuralFlow = clamp(parsed.structuralFlow);
  const communication = clamp(parsed.communication);
  const deliveryQuality = clamp(parsed.deliveryQuality);
  const relevance = clamp(parsed.relevance);

  const overall = clamp(
(
      technicalAccuracy +
      structuralFlow +
      communication +
      deliveryQuality +
      relevance
    ) / 5
  );

  const performanceImpact =
    ['positive', 'neutral', 'negative'].includes(parsed.performanceImpact)
      ? parsed.performanceImpact
      : 'neutral';

  return {
    technicalAccuracy,
    structuralFlow,
    communication,
    confidence: deliveryQuality,
    relevance,
    correctness:
      typeof parsed.correctness === 'number'
        ? clamp(parsed.correctness)
        : null,
    completeness:
      typeof parsed.completeness === 'number'
        ? clamp(parsed.completeness)
        : null,
    overall,
    strengths: stringArray(parsed.strengths),
    weaknesses: stringArray(parsed.weaknesses),
    missingPoints: stringArray(parsed.missingPoints),
    improvementSuggestions: stringArray(
      parsed.improvementSuggestions
    ),
    evidenceFromDocument: stringArray(
      parsed.evidenceFromDocument
    ),
    performanceImpact,
    aiFeedback: parsed.aiFeedback.trim(),
    suggestedAnswer: parsed.suggestedAnswer.trim(),
    source: 'ai',
  };
}

async function generateSessionFeedback({
  scores,
  purpose,
  totalQuestions,
  missedCount = 0,
  timedOut = false,
  missedQuestions = [],
}) {
  const systemPrompt =
    'You are an expert interview coach. ' +
    'Summarize the completed InterviewMate mock interview using only the supplied scores and feedback. ' +
    'Return ONLY valid JSON.';

  const scoreSummary = (scores || [])
    .map(
      (score, index) =>
        `Q${index + 1}: overall=${score.overall}, ` +
        `technical=${score.technicalAccuracy}, ` +
        `communication=${score.communication}, ` +
        `relevance=${score.relevance}, ` +
        `feedback=${String(score.aiFeedback || '').slice(0, 300)}`
    )
    .join('\n');

  const prompt = [
    `Interview purpose: ${purpose || ''}`,
    totalQuestions
      ? `Questions planned: ${totalQuestions}. Answered: ${(scores || []).length}. Not answered: ${missedCount}${timedOut ? ' (the interview timed out)' : ''}. Never describe unanswered questions as answered.`
      : '',
    missedQuestions.length ? `Missed questions: ${missedQuestions.map((q) => `Q${q.index} (${q.status})`).join(', ')}` : '',
    '',
    'PER-QUESTION RESULTS:',
    scoreSummary || 'No scored answers.',
    '',
    'Return exactly:',
    '{"assessment":"...","strengths":["..."],"improvements":["..."]}',
    '',
    'Assessment should be 2-3 sentences.',
    'Provide 2-4 specific strengths and 2-4 specific improvements.',
  ].join('\n');

  const raw = await callOllama(
    systemPrompt,
    prompt,
    600
  );

  const parsed = parseJsonResponse(raw);

  if (
    typeof parsed.assessment !== 'string' ||
    !Array.isArray(parsed.strengths) ||
    !Array.isArray(parsed.improvements)
  ) {
    throw new Error(
      'Ollama session feedback response has an unexpected shape'
    );
  }

  const avg = (key) =>
    scores && scores.length
      ? Math.round(
          scores.reduce(
            (sum, score) => sum + Number(score[key] || 0),
            0
          ) / scores.length
        )
      : 0;

  const overallScore = avg('overall');

  const categoryScores = {
    communication: avg('communication'),
    technicalKnowledge: avg('technicalAccuracy'),
    confidence: avg('confidence'),
    answerRelevance: avg('relevance'),
    technicalAccuracy: avg('technicalAccuracy'),
    structuralFlow: avg('structuralFlow'),
    deliveryPace: avg('communication'),
  };

  const knowledge = avg('technicalAccuracy');
  const communication = avg('communication');

  /*
   * Keep the same output shape as the existing Gemini pipeline.
   *
   * NOTE:
   * The existing database/UI still contains a "confidence" field.
   * This fallback does not treat it as a psychological judgement.
   * It simply preserves the existing schema so the frontend does not break.
   */
  const behavioral = avg('confidence'); // observable delivery quality, not psychological confidence
  const interviewPerformance = Math.round(
    (avg('relevance') + avg('structuralFlow')) / 2
  );

  const weightedScores = {
    knowledge,
    communication,
    behavioral,
    interviewPerformance,
  };

  const overallPercentage = Math.round(
    knowledge * 0.4 +
      communication * 0.2 +
      behavioral * 0.2 +
      interviewPerformance * 0.2
  );

  return {
    overallScore,
    categoryScores,
    weightedScores,
    overallPercentage,
    assessment: parsed.assessment.trim(),
    strengths: stringArray(parsed.strengths),
    improvements: stringArray(parsed.improvements),
    source: 'ai',
  };
}

module.exports = {
  isConfigured,
  generateQuestion,
  scoreAnswer,
  generateSessionFeedback,
};