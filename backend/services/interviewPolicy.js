/**
 * Interview policy - the single place where Start Interview settings are
 * turned into concrete rules for question generation, adaptation and
 * evaluation. Both Gemini and Ollama receive the exact same directives, so a
 * mid-interview provider switch never changes how the interview behaves.
 *
 * Nothing here calls an AI provider and nothing here invents content: it only
 * builds instructions from the session configuration and the real history of
 * the session (previous questions, answers and evaluations).
 */

const PURPOSES = {
  'Job Interview':
    'Job interview. Probe how the candidate applied the material in real work: decisions, trade-offs, ownership and results described in the document.',
  'Academic Viva':
    'Academic course, subject, or laboratory viva. Probe understanding of concepts, methods, experiments, results, and reasoning explicitly covered by the supplied material.',
  'Thesis Defense':
    'Thesis defense. Probe the research question, motivation, methodology, evidence, results, limitations, and contribution only where covered by the supplied thesis material.',
  'Course/Subject Viva':
    'University course/subject viva. Probe understanding of definitions, mechanisms and relationships between concepts in the document.',
  'Internship Interview':
    'Internship interview. Stay with fundamentals, reasoning and learning ability; avoid expert-level edge cases.',
  'Academic/Oral Exam':
    'Academic oral exam / defense. Probe methodology, justification of choices, limitations and critical thinking about the material.',
  'Certification Prep':
    'Certification preparation. Use scenario-style questions that apply the documented concepts to a concrete situation.',
};
const PURPOSE_ALIASES = {
  'Course/Subject Viva': 'Academic Viva',
  'Academic/Oral Exam': 'Thesis Defense',
};
const PURPOSE_CATEGORIES = {
  'Job Interview': 'Technical & Coding Viva',
  'Academic Viva': 'Subject/Course Viva',
  'Internship Interview': 'Basic Technical Viva',
  'Thesis Defense': 'Thesis/Project Defense',
};

const PURPOSE_FOCUS = [
  [/job/i, 'Focus on role-relevant experience, decisions, trade-offs, ownership and outcomes explicitly described in the document.'],
  [/internship/i, 'Focus on foundational concepts, reasoning, learning ability and practical examples from the document.'],
  [/academic|course|subject|lab/i, 'Focus on concepts, mechanisms, methods, observations and results covered by the course or lab material.'],
  [/system design/i, 'Focus on architecture, components, data flow, scalability and trade-offs that appear in the document.'],
  [/behavioral|star|mindset/i, 'Focus on experiences, actions and outcomes described in the document (situation, task, action, result).'],
  [/\bhr\b/i, 'Focus on background, motivation, goals and experience stated in the document.'],
  [/lab|practical/i, 'Focus on procedures, observations, outputs and reasoning about experiments or code described in the document.'],
  [/thesis|project|defense/i, 'Focus on problem statement, method, evaluation, results and limitations described in the document.'],
  [/problem solving|aptitude/i, 'Focus on reasoning steps and logic behind problems or solutions that appear in the document.'],
  [/comprehensive|board/i, 'Spread questions across the major sections of the document instead of dwelling on one topic.'],
  [/technical|coding|domain|basic|subject|course/i, 'Focus on the technical concepts, mechanisms and terminology that appear in the document.'],
];

const LEVELS = {
  Beginner: 'Expect only basic understanding. Prefer simple "what/why" questions and avoid edge cases.',
  'Entry-Level': 'Expect foundational understanding. Prefer "what/why/how" questions over edge cases.',
  Advanced: 'Expect depth. Ask about trade-offs, failure modes, justification and generalisation.',
  'Junior / Entry': 'Expect foundational understanding. Prefer "what/why/how" questions over edge cases.',
  'Mid-Level': 'Expect working knowledge. Ask for reasoning, comparisons and practical application.',
  'Senior / Staff': 'Expect depth. Ask about trade-offs, failure modes, justification and generalisation.',
};

const ALLOWED = {
  difficulty: ['Easy', 'Intermediate', 'Hard'],
  level: Object.keys(LEVELS),
  mode: ['Audio + Video', 'Audio Only', 'Text Response'],
};

const MIN_SECONDS_PER_QUESTION = 30;
const MAX_QUESTIONS = 20;
const MAX_MINUTES = 60;

/** Validates and normalises the Start Interview payload. Returns { error } or { value }. */
function parseSetup(body = {}) {
  const submittedPurpose = String(body.purpose || '').trim();
  const purpose = PURPOSE_ALIASES[submittedPurpose] || submittedPurpose;
  const difficulty = String(body.difficulty || '').trim();
  const level = String(body.level || 'Mid-Level').trim();
  const mode = String(body.mode || 'Text Response').trim();
  const customPurpose = String(body.customPurpose || '').trim().slice(0, 160);
  const adaptiveDifficultyInput = body.adaptiveDifficulty;
  const adaptiveDifficulty = adaptiveDifficultyInput === undefined
    ? true
    : adaptiveDifficultyInput === true || adaptiveDifficultyInput === 'true'
      ? true
      : adaptiveDifficultyInput === false || adaptiveDifficultyInput === 'false'
        ? false
        : adaptiveDifficultyInput;

  if (!Object.hasOwn(PURPOSE_CATEGORIES, purpose)) {
    return { error: 'Choose Job Interview, Academic Viva, Internship Interview, or Thesis Defense.' };
  }
  if (typeof adaptiveDifficulty !== 'boolean') return { error: 'Adaptive difficulty must be true or false.' };
  if (!ALLOWED.difficulty.includes(difficulty)) {
    return { error: `Difficulty must be one of: ${ALLOWED.difficulty.join(', ')}.` };
  }
  if (!ALLOWED.level.includes(level)) return { error: `Level must be one of: ${ALLOWED.level.join(', ')}.` };
  if (!ALLOWED.mode.includes(mode)) return { error: `Mode must be one of: ${ALLOWED.mode.join(', ')}.` };

  const totalQuestions = parseInt(String(body.questions || '').match(/\d+/)?.[0], 10);
  if (!totalQuestions || totalQuestions < 1 || totalQuestions > MAX_QUESTIONS) {
    return { error: `Question count must be between 1 and ${MAX_QUESTIONS}.` };
  }

  const durationMinutes = parseInt(String(body.duration || '').match(/\d+/)?.[0], 10);
  if (!durationMinutes || durationMinutes < 1 || durationMinutes > MAX_MINUTES) {
    return { error: `Duration must be between 1 and ${MAX_MINUTES} minutes.` };
  }

  if ((durationMinutes * 60) / totalQuestions < MIN_SECONDS_PER_QUESTION) {
    const minMinutes = Math.ceil((totalQuestions * MIN_SECONDS_PER_QUESTION) / 60);
    return {
      error: `${totalQuestions} questions need at least ${minMinutes} minutes (about ${MIN_SECONDS_PER_QUESTION} seconds each). Increase the duration or reduce the question count.`,
    };
  }

  return {
    value: {
      purpose,
      customPurpose,
      resolvedPurpose: customPurpose || purpose,
      type: PURPOSE_CATEGORIES[purpose],
      difficulty,
      level,
      mode,
      adaptiveDifficulty,
      totalQuestions,
      durationMinutes,
      durationLabel: `${durationMinutes} Mins`,
    },
  };
}

function purposeFocus(purpose = '') {
  const hit = PURPOSE_FOCUS.find(([re]) => re.test(purpose));
  return hit ? hit[1] : 'Focus on the most important topics in the document.';
}

/** True when the answer carries audio signals (spoken, not typed). */
function isSpokenAnswer(mode, answerWasSpoken) {
  return /audio|video/i.test(mode || '') && Boolean(answerWasSpoken);
}

function fmtTime(seconds) {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, Math.round(seconds % 60));
  return `${m}m ${s}s`;
}

/** Directives appended to every question-generation prompt. */
function questionDirectives(params = {}) {
  const {
    purpose,
    level,
    mode,
    questionNumber,
    totalQuestions,
    remainingSeconds,
    adaptivePlan,
    previousContext = [],
    purposeKey,
  } = params;

  const lines = ['## INTERVIEW POLICY (applies to every question; the document remains the only knowledge source)'];

  lines.push(`- Purpose: ${PURPOSES[purposeKey || purpose] || `Custom purpose: ${purpose}. Keep questions relevant to it, using only the document.`}`);
  lines.push(`- Focus: ${purposeFocus(purpose)}`);
  lines.push(`- Level: ${LEVELS[level] || LEVELS['Mid-Level']}`);

  if (/audio|video/i.test(mode || '')) {
    lines.push('- Response mode is spoken: ask ONE short question answerable out loud in 20-60 seconds. Never ask the candidate to write code or long lists.');
  } else {
    lines.push('- Response mode is typed: the question may ask for a brief written explanation, but it must still be one short viva-style question.');
  }

  if (remainingSeconds != null && totalQuestions && questionNumber) {
    const remainingQuestions = totalQuestions - questionNumber + 1;
    const perQuestion = Math.max(0, Math.floor(remainingSeconds / Math.max(1, remainingQuestions)));
    lines.push(
      `- Time left: ${fmtTime(remainingSeconds)} for ${remainingQuestions} question(s) (~${perQuestion}s each). ` +
        (perQuestion < 60
          ? 'Time is tight: ask a focused question with a short answer.'
          : 'There is room for a question that needs a reasoned answer.')
    );
  }

  if (adaptivePlan) {
    lines.push('', '## ADAPTIVE INSTRUCTION FOR THIS QUESTION');
    lines.push(`Direction: ${adaptivePlan.direction.toUpperCase()} (target difficulty: ${adaptivePlan.difficulty}).`);
    lines.push(adaptivePlan.instruction);
    if (adaptivePlan.revisit.length) {
      lines.push(`Points the candidate missed or got wrong recently (consider probing one, from the document): ${adaptivePlan.revisit.join('; ')}`);
    }
    if (adaptivePlan.strengths.length) {
      lines.push(`Areas the candidate handled well: ${adaptivePlan.strengths.join('; ')}`);
    }
  }

  if (previousContext.length) {
    lines.push(
      '',
      '## EVALUATION HISTORY (most recent last)',
      ...previousContext.slice(-6).map(
        (e, i) =>
          `${i + 1}. [${e.difficulty || '?'} | ${e.score ?? 'n/a'}/100] ${String(e.question).slice(0, 160)}` +
          (e.weaknesses?.length ? ` | weak: ${e.weaknesses.slice(0, 2).join('; ')}` : '') +
          (e.missingPoints?.length ? ` | missed: ${e.missingPoints.slice(0, 2).join('; ')}` : '')
      ),
      'Do not repeat or closely rephrase any earlier question. Prefer a different part of the document unless a follow-up is instructed above.'
    );
  }

  return lines.join('\n');
}

/** Directives appended to every answer-evaluation prompt. */
function evaluationDirectives({ purpose, level, mode, spoken, mediaMetrics, standalonePractice } = {}) {
  const lines = [
    '## EVALUATION POLICY',
    standalonePractice
      ? `Context: standalone practice / ${level || ''}. Judge using accurate general subject knowledge and the question; no uploaded document is provided.`
      : `Context: ${purpose || 'Interview'} / ${level || ''}. Judge against what is fair at this level and what the document actually says.`,
    standalonePractice
      ? 'Evaluate correctness, relevance, completeness, and explanation quality using general subject knowledge.'
      : 'Evaluate ONLY: correctness, relevance, completeness, document evidence, explanation quality.',
    standalonePractice
      ? 'List strengths, weaknesses, important missing points, concrete improvement suggestions and a better answer. Do not claim document evidence.'
      : 'List strengths, weaknesses, missing points (from the document), concrete improvement suggestions and a better answer.',
    'NEVER infer or comment on anxiety, honesty, intelligence, personality, mental state or psychological confidence.',
    'Field meaning: "deliveryQuality" is DELIVERY (clarity and organisation of how the answer was expressed), never an emotional state.',
  ];

  if (!spoken) {
    lines.push(
      'This answer was TYPED. No audio or video signals exist. Do NOT penalise or mention pace, pauses, filler words, camera or posture. ' +
        'Set "deliveryQuality" equal to your "communication" score.'
    );
    return lines.join('\n');
  }

  lines.push('This answer was SPOKEN and transcribed. Do not penalise transcription artefacts or missing written formatting.');

  const m = mediaMetrics || {};
  const speech = [];
  if (m.speechRate != null) speech.push(`speaking pace ~${m.speechRate} words/min (comfortable range is roughly 110-170)`);
  if (m.fillerWordRate != null) speech.push(`filler words ${m.fillerWordCount} (${Math.round(m.fillerWordRate * 100)}% of words)`);
  if (m.pauseCount != null) speech.push(`${m.pauseCount} noticeable pause(s), longest ${m.longestPauseSeconds}s, silence ${Math.round((m.silenceRatio || 0) * 100)}% of recording`);
  if (m.responseDurationSeconds != null) speech.push(`response duration ${m.responseDurationSeconds}s`);
  if (speech.length) {
    lines.push(
      'Observable speech signals (minor input to "communication"/"deliveryQuality" only; short natural pauses are normal and not a weakness):',
      ...speech.map((s) => `- ${s}`)
    );
  } else {
    lines.push('No speech signals were measured for this answer; do not guess them.');
  }

  if (/video/i.test(mode || '')) {
    const video = [];
    if (m.faceVisibleRatio != null) video.push(`face visible in frame ${Math.round(m.faceVisibleRatio * 100)}% of the time`);
    if (m.movementScore != null) video.push(`movement level ${m.movementScore} on a 0-100 scale (higher = more visible movement)`);
    if (video.length) {
      lines.push(
        'Observable video signals (use only as a small supporting note on visible engagement/posture stability; never penalise normal gestures or isolated glances away):',
        ...video.map((s) => `- ${s}`)
      );
    } else {
      lines.push('No video signals were measured for this answer. Do not mention or penalise camera behaviour.');
    }
  }

  return lines.join('\n');
}

/**
 * Applies mode rules after the provider returns, so the rules hold no matter
 * which provider produced the evaluation.
 */
function normalizeScore(scored, { spoken }) {
  const out = { ...scored };
  if (!spoken && out.confidence === undefined) {
    out.confidence = out.communication;
  }
  for (const key of ['technicalAccuracy', 'structuralFlow', 'communication', 'confidence', 'relevance']) {
    if (typeof out[key] !== 'number' || !Number.isFinite(out[key])) {
      throw new Error(`AI evaluation returned an invalid ${key} score`);
    }
    out[key] = Math.max(0, Math.min(100, Math.round(out[key])));
  }
  if (!spoken) {
    out.confidence = out.communication;
  }
  out.overall = Math.max(
    0,
    Math.min(
      100,
      Math.round((out.technicalAccuracy + out.structuralFlow + out.communication + out.confidence + out.relevance) / 5)
    )
  );
  return out;
}

module.exports = {
  PURPOSES,
  PURPOSE_CATEGORIES,
  ALLOWED,
  MIN_SECONDS_PER_QUESTION,
  parseSetup,
  isSpokenAnswer,
  questionDirectives,
  evaluationDirectives,
  normalizeScore,
};
