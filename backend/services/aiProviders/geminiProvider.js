const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta';

const DEFAULT_MODEL = 'gemini-3.6-flash';

const { InsufficientDocumentError } = require('../aiErrors');

function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

async function callGemini(
  systemPrompt,
  userPrompt,
  maxTokens = 1024,
  documentParts = []
) {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const url = `${GEMINI_API_BASE}/models/${model}:generateContent`;

  const parts = [
    ...documentParts.map((part) => ({
      inlineData: {
        mimeType: part.mimeType,
        data: part.data,
      },
    })),
    { text: userPrompt },
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      systemInstruction: {
        parts: [
          {
            text: systemPrompt,
          },
        ],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Gemini API error (${response.status}): ${body.slice(0, 300)}`
    );
  }

  const data = await response.json();
  const candidate = (data.candidates || [])[0];
  const part = candidate?.content?.parts?.[0];
  const text = part?.text;

  if (!text) {
    const finishReason = candidate?.finishReason || 'unknown';

    throw new Error(
      `Gemini API response contained no text content (finishReason: ${finishReason})`
    );
  }

  return text;
}

function parseJsonResponse(rawText) {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*|^```\s*|```$/g, '')
    .trim();

  return JSON.parse(cleaned);
}

const MAX_GROUNDING_ATTEMPTS = 3;

const EXAM_STYLE_PATTERN =
  /\b(\d+\s*marks?|for\s+\d+\s*points?|discuss\s+in\s+detail|write\s+an?\s+essay|write\s+short\s+notes?\s+on|explain\s+in\s+detail|elaborate\s+on)\b/i;

function looksLikeExamQuestion(text) {
  if (EXAM_STYLE_PATTERN.test(text)) return true;

  if (text.split(/\s+/).length > 40) return true;

  return false;
}

function buildQuestionPrompt({
  category,
  difficulty,
  purpose,
  type,
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
}) {
  const promptLines = [
    '## Interview configuration (all of this must shape the question)',
    `Purpose: ${purpose}`,
    `Interview type: ${type}`,
    `Question category: ${category}`,
    `Target difficulty: ${difficulty}`,
  ];

  if (level) {
    promptLines.push(`Candidate level: ${level}`);
  }

  if (duration) {
    promptLines.push(
      `Total interview duration: ${duration} (pace depth accordingly - a short slot means tighter, more focused questions)`
    );
  }

  if (mode) {
    promptLines.push(
      `Response mode: ${mode}` +
        (/audio|video/i.test(mode)
          ? ' (the candidate answers out loud, so favour questions that can be answered verbally - avoid asking them to write out long code)'
          : ' (the candidate types their answer, so written/code-style questions are fine)')
    );
  }

  if (materials) {
    promptLines.push(`Provided materials: ${materials}`);
  }

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

  const hasWholeDocument = documentParts.some(
    (p) => p.mimeType === 'application/pdf'
  );

  promptLines.push(
    '',
    '## STRICT DOCUMENT-GROUNDING RULE (this overrides everything else)',
    'The attached/extracted document below is the ONLY knowledge source you are allowed to use. ' +
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
      promptLines.push(
        '',
        '## Uploaded document (extracted text)',
        `"""\n${documentText.slice(0, 6000)}\n"""`
      );
    }

    if (documentParts.length > 0) {
      promptLines.push(
        '',
        '## Uploaded document (attached images)',
        `${documentParts.length} image${
          documentParts.length > 1 ? 's' : ''
        } extracted from the document (diagrams/charts/figures/slide visuals) are attached to this request - base your question on them too where relevant.`
      );
    }
  }

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
        `Score: ${entry.score}/100${
          entry.feedback ? ` - ${String(entry.feedback).slice(0, 300)}` : ''
        }`
      );
    });
  } else if (askedTexts.length > 0) {
    promptLines.push(
      `Already asked (do not repeat or closely echo these):\n- ${askedTexts.join(
        '\n- '
      )}`
    );
  } else {
    promptLines.push('This is the first question of the session.');
  }

  if (rejectionNotes.length > 0) {
    promptLines.push(
      '',
      '## Previous attempt(s) rejected',
      'Your last attempt(s) at a question were rejected for not being strictly grounded in the document. Do not repeat this mistake:',
      ...rejectionNotes.map(
        (note, i) => `Attempt ${i + 1} rejected: ${note}`
      )
    );
  }

  promptLines.push(
    '',
    'Generate exactly one new interview question that fits every configuration value above AND is strictly ' +
      'grounded in the document. Respond with ONLY a JSON object: {"text": "...", "basedOn": "<the specific fact, ' +
      'section, heading, or visual in the document this question is based on>"}'
  );

  return promptLines.join('\n');
}

async function validateGrounding({
  questionText,
  basedOn,
  documentText,
  documentParts,
}) {
  const systemPrompt =
    'You are a strict fact-checker for a live spoken viva. You will be shown a document and an interview question ' +
    'that claims to be based on it. Reject the question (grounded: false) if EITHER: (1) it is not genuinely ' +
    'answerable using ONLY information explicitly present in the document, or (2) it reads like a written exam/' +
    'assignment prompt rather than a short spoken viva question (e.g. it expects an essay-length answer, or is ' +
    'phrased as "discuss/explain in detail ..."). Respond with ONLY a JSON object: ' +
    '{"grounded": true|false, "reason": "one short sentence"}';

  const hasWholeDocument = documentParts.some(
    (p) => p.mimeType === 'application/pdf'
  );

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

  try {
    const raw = await callGemini(
      systemPrompt,
      promptLines.join('\n'),
      150,
      documentParts
    );

    const parsed = parseJsonResponse(raw);

    return {
      grounded: parsed.grounded === true,
      reason: parsed.reason || '',
    };
  } catch (error) {
    return {
      grounded: false,
      reason: `Validator error: ${error.message}`,
    };
  }
}

async function generateQuestion(params) {
  const { documentText, documentParts = [] } = params;
  const rejectionNotes = [];

  for (
    let attempt = 1;
    attempt <= MAX_GROUNDING_ATTEMPTS;
    attempt++
  ) {
    const prompt = buildQuestionPrompt({
      ...params,
      documentParts,
      rejectionNotes,
    });

    const systemPrompt =
      'You are an expert interviewer conducting a live, adaptive interview, strictly grounded in a candidate-' +
      'supplied document. You generate ONE question at a time. Respond with ONLY a JSON object of the form ' +
      '{"text": "...", "basedOn": "..."} - no markdown, no explanation, no code fences.';

    const raw = await callGemini(
      systemPrompt,
      prompt,
      400,
      documentParts
    );

    const parsed = parseJsonResponse(raw);

    if (!parsed.text || typeof parsed.text !== 'string') {
      throw new Error(
        'Gemini question response missing "text" field'
      );
    }

    if (looksLikeExamQuestion(parsed.text)) {
      rejectionNotes.push(
        `"${parsed.text}" - this reproduces written-exam/essay wording, not a short spoken viva`
      );
      continue;
    }

    const { grounded, reason } = await validateGrounding({
      questionText: parsed.text,
      basedOn: parsed.basedOn,
      documentText,
      documentParts,
    });

    if (grounded) {
      return {
        text: parsed.text.trim(),
        source: 'ai',
      };
    }

    rejectionNotes.push(
      `"${parsed.text}" - ${reason || 'not supported by the document'}`
    );
  }

  throw new InsufficientDocumentError(
    'The uploaded document does not contain enough information to generate a question that fits this configuration. ' +
      'Try a different/more detailed document, or adjust the interview settings.'
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
  mediaMetrics,
}) {
  const systemPrompt =
    "You are an expert interview evaluator conducting a live viva. Score the candidate's answer honestly and " +
    'constructively, judging it strictly against the uploaded document and the question - not generic expectations. ' +
    'Respond with ONLY a JSON object with this exact shape: ' +
    '{"technicalAccuracy":0,"structuralFlow":0,"communication":0,"confidence":0,"relevance":0,' +
    '"correctness":0,"completeness":0,' +
    '"strengths":["..."],"weaknesses":["..."],"missingPoints":["..."],"improvementSuggestions":["..."],' +
    '"evidenceFromDocument":["..."],"performanceImpact":"positive|neutral|negative",' +
    '"aiFeedback":"...","suggestedAnswer":"..."} ' +
    'All score fields are integers 0-100. strengths/weaknesses/missingPoints/improvementSuggestions are each 1-3 ' +
    'short bullet points specific to THIS answer - never reuse generic phrasing across different answers. ' +
    'evidenceFromDocument lists the specific document passages/facts used to judge this answer (1-3 short items). ' +
    'performanceImpact is how this answer should influence the difficulty of the NEXT question: "positive" if the ' +
    'candidate should be challenged more, "negative" if the next question should be simpler/more foundational, ' +
    '"neutral" otherwise. No markdown, no explanation outside the JSON.';

  const promptLines = [
    `Category: ${category}`,
    `Difficulty: ${difficulty}`,
    ...(level
      ? [
          `Candidate level: ${level} (grade against what is fair to expect at this level)`,
        ]
      : []),
    ...(mode && /audio|video/i.test(mode)
      ? [
          'Note: this was a spoken answer transcribed to text, so do not penalise transcription artefacts or lack of written formatting.',
        ]
      : []),
    ...(mediaMetrics &&
    (mediaMetrics.speechRate !== null ||
      mediaMetrics.fillerWordRate !== null)
      ? [
          'Observable speech signals for this answer (use only as minor supporting context for the communication score - never infer confidence, anxiety, personality, or any psychological state from these):',
          ...(mediaMetrics.speechRate !== null
            ? [
                `- Speaking pace: ~${mediaMetrics.speechRate} words per minute`,
              ]
            : []),
          ...(mediaMetrics.fillerWordRate !== null
            ? [
                `- Filler words: ${mediaMetrics.fillerWordCount} of ${
                  answerText.trim().split(/\s+/).length
                } words (${Math.round(
                  mediaMetrics.fillerWordRate * 100
                )}%)`,
              ]
            : []),
        ]
      : []),
    `Question: ${questionText}`,
    `Candidate's answer: ${answerText || '(no answer provided)'}`,
  ];

  const hasWholeDocument = documentParts.some(
    (p) => p.mimeType === 'application/pdf'
  );

  if (hasWholeDocument) {
    promptLines.push(
      'The candidate\'s uploaded document is attached to this request - judge correctness/relevance/completeness strictly against what it actually contains, and list any relevant points from it the candidate missed.'
    );
  } else if (documentText && documentText.trim()) {
    promptLines.push(
      "For context, here is the candidate's uploaded document - judge correctness/relevance/completeness against it, and list any relevant points from it the candidate missed:",
      `"""\n${documentText.slice(0, 4000)}\n"""`
    );
  }

  promptLines.push(
    'Evaluate the answer across the five score dimensions, list specific strengths/weaknesses/missing points for THIS answer, write a short constructive critique (aiFeedback), and provide a strong model answer (suggestedAnswer).'
  );

  const raw = await callGemini(
    systemPrompt,
    promptLines.join('\n'),
    800,
    documentParts
  );

  const parsed = parseJsonResponse(raw);

  const requiredNumberFields = [
    'technicalAccuracy',
    'structuralFlow',
    'communication',
    'confidence',
    'relevance',
  ];

  for (const field of requiredNumberFields) {
    if (typeof parsed[field] !== 'number') {
      throw new Error(
        `Gemini score response missing numeric field "${field}"`
      );
    }
  }

  if (
    typeof parsed.aiFeedback !== 'string' ||
    typeof parsed.suggestedAnswer !== 'string'
  ) {
    throw new Error(
      'Gemini score response missing aiFeedback/suggestedAnswer'
    );
  }

  const asStringArray = (val) =>
    Array.isArray(val)
      ? val.filter((v) => typeof v === 'string')
      : [];

  const clamp = (n) =>
    Math.max(0, Math.min(100, Math.round(n)));

  const overall = Math.round(
    (parsed.technicalAccuracy +
      parsed.structuralFlow +
      parsed.communication +
      parsed.confidence +
      parsed.relevance) /
      5
  );

  const validImpacts = ['positive', 'neutral', 'negative'];

  return {
    technicalAccuracy: clamp(parsed.technicalAccuracy),
    structuralFlow: clamp(parsed.structuralFlow),
    communication: clamp(parsed.communication),
    confidence: clamp(parsed.confidence),
    relevance: clamp(parsed.relevance),
    correctness:
      typeof parsed.correctness === 'number'
        ? clamp(parsed.correctness)
        : null,
    completeness:
      typeof parsed.completeness === 'number'
        ? clamp(parsed.completeness)
        : null,
    overall: clamp(overall),
    strengths: asStringArray(parsed.strengths),
    weaknesses: asStringArray(parsed.weaknesses),
    missingPoints: asStringArray(parsed.missingPoints),
    improvementSuggestions: asStringArray(
      parsed.improvementSuggestions
    ),
    evidenceFromDocument: asStringArray(
      parsed.evidenceFromDocument
    ),
    performanceImpact: validImpacts.includes(
      parsed.performanceImpact
    )
      ? parsed.performanceImpact
      : 'neutral',
    aiFeedback: parsed.aiFeedback,
    suggestedAnswer: parsed.suggestedAnswer,
    source: 'ai',
  };
}

async function generateSessionFeedback({
  scores,
  purpose,
  type,
}) {
  const systemPrompt =
    'You are an expert interview coach summarizing a completed mock interview session. ' +
    'Respond with ONLY a JSON object of this exact shape: ' +
    '{"assessment":"...","strengths":["...","..."],"improvements":["...","..."]} ' +
    'No markdown, no explanation outside the JSON. Keep the assessment to 2-3 sentences, and provide 2-4 short strengths and improvements.';

  const scoreSummary = scores
    .map(
      (s, i) =>
        `Q${i + 1}: overall ${s.overall}, technicalAccuracy ${s.technicalAccuracy}, structuralFlow ${s.structuralFlow}, communication ${s.communication}, confidence ${s.confidence}, relevance ${s.relevance}`
    )
    .join('\n');

  const userPrompt = [
    `Interview purpose: ${purpose}`,
    `Interview type: ${type}`,
    'Per-question scores:',
    scoreSummary,
    'Write an overall assessment paragraph plus lists of strengths and areas to improve.',
  ].join('\n');

  const raw = await callGemini(
    systemPrompt,
    userPrompt,
    500
  );

  const parsed = parseJsonResponse(raw);

  if (
    typeof parsed.assessment !== 'string' ||
    !Array.isArray(parsed.strengths) ||
    !Array.isArray(parsed.improvements)
  ) {
    throw new Error(
      'Gemini session feedback response has an unexpected shape'
    );
  }

  const avg = (key) =>
    scores.length > 0
      ? Math.round(
          scores.reduce((acc, s) => acc + s[key], 0) /
            scores.length
        )
      : 0;

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
  const communication = avg('communication');
  const behavioral = avg('confidence');
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
    assessment: parsed.assessment,
    strengths: parsed.strengths,
    improvements: parsed.improvements,
    source: 'ai',
  };
}

module.exports = {
  isConfigured,
  generateQuestion,
  scoreAnswer,
  generateSessionFeedback,
};