/**
 * Fallback (non-AI) provider.
 *
 * This is a deterministic, rule-based stand-in used only when no real AI
 * provider is configured (see ../aiService.js for the selection logic).
 * It exists so the interview flow is fully usable out of the box, but it
 * must never be confused with genuine AI output - every value it returns
 * carries `source: 'fallback'` so callers (and the database records they
 * write) can tell the difference honestly.
 *
 * None of the "feedback" text here is produced by a language model - it's
 * template text driven by simple heuristics (word count, keyword overlap,
 * filler-word counting). Swap in a real provider (see anthropicProvider.js)
 * to get actual AI-generated questions and evaluation.
 */

const QUESTION_BANKS = {
  Technical: {
    Easy: [
      'What is the difference between an array and a linked list?',
      'Explain what a REST API is and how it is typically structured.',
      'What is the difference between "==" and "===" in JavaScript?',
    ],
    Intermediate: [
      'How would you design a database schema for a simple e-commerce order system?',
      'Explain the time and space complexity trade-offs of a hash map versus a balanced binary search tree.',
      'Walk through how you would debug a memory leak in a long-running Node.js service.',
    ],
    Hard: [
      'Design a rate limiter that can be used across multiple distributed servers. What data structures and consistency guarantees would you use?',
      'How would you shard a large relational database that is starting to hit write throughput limits?',
      'Explain how you would design a system to deduplicate events arriving out of order from multiple producers.',
    ],
  },
  'System Design': {
    Easy: [
      'What are the main differences between a monolithic and a microservices architecture?',
      'What is a load balancer and why is it used?',
    ],
    Intermediate: [
      'Design a URL shortening service like bit.ly. What are the key components?',
      'How would you design a notification system that supports email, SMS, and push notifications?',
    ],
    Hard: [
      'Design a system like Google Docs that supports real-time collaborative editing by multiple users.',
      'How would you design a globally distributed cache with strong consistency guarantees for hot keys?',
    ],
  },
  Behavioral: {
    Easy: [
      'Tell me about a time you had to learn a new technology quickly to complete a task.',
      'Describe a situation where you worked as part of a team to complete a project.',
    ],
    Intermediate: [
      'Tell me about a time you disagreed with a teammate or manager. How did you handle it?',
      'Describe a time you had to meet a tight deadline. What did you prioritize and why?',
    ],
    Hard: [
      'Describe a situation where a project you were responsible for failed. What did you learn and what would you do differently?',
      'Tell me about a time you had to influence a decision without having direct authority over the people involved.',
    ],
  },
  Academic: {
    Easy: [
      'Explain the core objective of your project or thesis in simple terms.',
      'What are the fundamental concepts your course covers, and why do they matter?',
    ],
    Intermediate: [
      'Walk through the methodology you used in your project and justify your key design choices.',
      'What existing research or approaches did you build on, and how does your work differ?',
    ],
    Hard: [
      'Defend your approach against an alternative method a critic might propose. Why is your approach still preferable?',
      'What are the limitations of your work, and how would future research address them?',
    ],
  },
  HR: {
    Easy: [
      'Tell me a bit about yourself and what interests you about this role.',
      'What are your key strengths and how have you applied them recently?',
    ],
    Intermediate: [
      'Where do you see yourself professionally in the next few years, and why?',
      'What kind of work environment helps you do your best work?',
    ],
    Hard: [
      'How do you handle competing priorities from multiple stakeholders with conflicting expectations?',
      'Tell me about a time you had to make a difficult decision with incomplete information.',
    ],
  },
};

const FILLER_WORDS = ['um', 'uh', 'like', 'basically', 'actually', 'you know', 'sort of', 'kind of'];

// Maps the free-form `type` string coming from the Start Interview wizard to
// one of the question-bank buckets above.
function resolveCategoryBucket(type = '') {
  const t = type.toLowerCase();
  if (t.includes('system design')) return 'System Design';
  if (t.includes('behavioral') || t.includes('star') || t.includes('mindset')) return 'Behavioral';
  if (t.includes('hr')) return 'HR';
  // Check technical/coding/domain BEFORE the viva/academic catch-all below, since
  // labels like "Technical & Coding Viva" and "Basic Technical Viva" contain the
  // word "viva" but are technical interviews, not academic ones.
  if (t.includes('technical') || t.includes('coding') || t.includes('domain')) return 'Technical';
  if (t.includes('viva') || t.includes('thesis') || t.includes('academic') || t.includes('board') || t.includes('defense')) return 'Academic';
  return 'Technical';
}

// Small deterministic hash so the same answer text always scores the same
// way (useful for testing) without needing real randomness.
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

async function generateQuestion({ category, difficulty, askedTexts = [] }) {
  const bucket = QUESTION_BANKS[category] || QUESTION_BANKS.Technical;
  const pool = bucket[difficulty] || bucket.Intermediate || Object.values(bucket)[0];

  const unused = pool.filter((q) => !askedTexts.includes(q));
  const text = (unused.length > 0 ? unused[0] : pool[hashString(askedTexts.join('|')) % pool.length]);

  return { text, source: 'fallback' };
}

async function scoreAnswer({ questionText, answerText }) {
  const trimmed = (answerText || '').trim();
  const words = trimmed ? trimmed.split(/\s+/) : [];
  const wordCount = words.length;
  const seed = hashString(trimmed || questionText);

  // Length heuristic: very short answers score low, very long ones plateau.
  const lengthScore = clamp(30 + Math.min(wordCount, 120) * 0.5);

  // Keyword overlap heuristic: how many "meaningful" words (4+ letters) from
  // the question also show up in the answer.
  const questionKeywords = (questionText.toLowerCase().match(/[a-z]{4,}/g) || []);
  const answerLower = trimmed.toLowerCase();
  const overlap = questionKeywords.filter((w) => answerLower.includes(w)).length;
  const relevanceScore = clamp(40 + overlap * 8);

  // Filler-word heuristic feeds into confidence/communication.
  const fillerCount = FILLER_WORDS.reduce(
    (acc, fw) => acc + (answerLower.split(fw).length - 1),
    0
  );
  const fillerPenalty = Math.min(fillerCount * 5, 30);

  const communication = clamp(lengthScore - fillerPenalty + (seed % 10));
  const confidence = clamp(70 - fillerPenalty + (seed % 15));
  const technicalAccuracy = clamp((lengthScore + relevanceScore) / 2 + (seed % 8));
  const structuralFlow = clamp(50 + Math.min(wordCount, 80) * 0.3 - fillerPenalty / 2);
  const relevance = relevanceScore;

  const overall = Math.round(
    (technicalAccuracy + structuralFlow + communication + confidence + relevance) / 5
  );

  const aiFeedback = wordCount < 15
    ? 'This answer is quite brief. Try expanding with a concrete example and a short explanation of your reasoning.'
    : overlap < 2
      ? 'The answer could stay closer to the terms used in the question - make sure to directly address the concepts being asked about.'
      : 'Solid answer overall. Consider structuring it as definition, explanation, then example for maximum clarity.';

  const suggestedAnswer = `A strong answer here would briefly define the core concept the question is asking about, explain the reasoning or trade-offs involved, and close with a concrete example or personal experience that demonstrates it in practice.`;

  return {
    technicalAccuracy: Math.round(technicalAccuracy),
    structuralFlow: Math.round(structuralFlow),
    communication: Math.round(communication),
    confidence: Math.round(confidence),
    relevance: Math.round(relevance),
    overall,
    strengths: [],
    weaknesses: [],
    missingPoints: [],
    aiFeedback,
    suggestedAnswer,
    source: 'fallback',
  };
}

async function generateSessionFeedback({ scores }) {
  const avg = (key) =>
    scores.length > 0 ? Math.round(scores.reduce((acc, s) => acc + s[key], 0) / scores.length) : 0;

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

  const strengths = [];
  const improvements = [];

  if (categoryScores.technicalKnowledge >= 75) strengths.push('Strong core technical concepts');
  if (categoryScores.communication >= 75) strengths.push('Clear, well-communicated explanations');
  if (categoryScores.answerRelevance >= 75) strengths.push('Answers stayed relevant to the questions asked');
  if (strengths.length === 0) strengths.push('Completed the full session without skipping questions');

  if (categoryScores.structuralFlow < 70) improvements.push('Answer structure could be improved - try definition, explanation, then example');
  if (categoryScores.confidence < 70) improvements.push('Reduce filler words and pauses to sound more confident');
  if (categoryScores.answerRelevance < 70) improvements.push('Stay more directly focused on the specific concepts each question asks about');
  if (improvements.length === 0) improvements.push('Keep practicing under timed conditions to build additional speed and consistency');

  const assessment = overallScore >= 80
    ? 'You demonstrated strong technical understanding throughout the session. Focus on tightening the structure of your answers to make them even more effective in high-pressure settings.'
    : overallScore >= 60
      ? 'You showed a reasonable grasp of the material, with some inconsistency across answers. Reviewing core concepts and practicing structured responses should help close the gap.'
      : 'This session highlighted some foundational gaps. Revisit the underlying concepts for the topics covered and practice explaining them out loud before your next session.';

  return { overallScore, categoryScores, assessment, strengths, improvements, source: 'fallback' };
}

module.exports = { resolveCategoryBucket, generateQuestion, scoreAnswer, generateSessionFeedback };
