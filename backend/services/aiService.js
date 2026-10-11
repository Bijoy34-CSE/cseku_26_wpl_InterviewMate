/**
 * AI service abstraction for InterviewMate Mock Interview.
 *
 * PRIMARY:
 *   Gemini
 *
 * AUTOMATIC FALLBACK:
 *   Ollama local model
 *
 * IMPORTANT:
 * - Mock Interview never uses fallbackProvider.
 * - Mock Interview never uses generic/static questions.
 * - Gemini is always attempted first when configured.
 * - Ollama is used automatically when Gemini is unavailable.
 * - The same params/context are passed to both providers.
 */

const fallbackProvider = require('./aiProviders/fallbackProvider');
const geminiProvider = require('./aiProviders/geminiProvider');
const ollamaProvider = require('./aiProviders/ollamaProvider');

const policy = require('./interviewPolicy');

const {
  InsufficientDocumentError,
  AiUnavailableError,
} = require('./aiErrors');

function getConfiguredProviders() {
  const providers = [];

  /*
   * Gemini is ALWAYS first.
   */
  if (geminiProvider.isConfigured()) {
    providers.push({
      name: 'gemini',
      provider: geminiProvider,
    });
  }

  /*
   * Ollama is ALWAYS second.
   * It is the local automatic fallback.
   */
  if (ollamaProvider.isConfigured()) {
    providers.push({
      name: 'ollama',
      provider: ollamaProvider,
    });
  }

  return providers;
}

function isRealAiConfigured() {
  return getConfiguredProviders().length > 0;
}

function shouldFallbackToOllama(error) {
  if (!error) return true;

  /*
   * This is a document-grounding failure, not a provider outage.
   *
   * Do not silently switch providers because doing so could hide the fact
   * that the document does not contain enough usable information.
   */
  if (error instanceof InsufficientDocumentError) {
    return false;
  }

  if (error.code === 'INSUFFICIENT_DOCUMENT') {
    return false;
  }

  /*
   * Provider/network/service errors should allow Ollama fallback.
   */
  return true;
}

async function runWithGeminiThenOllama(methodName, params) {
  const providers = getConfiguredProviders();

  if (providers.length === 0) {
    throw new AiUnavailableError(
      'No AI provider is configured. Configure Gemini or local Ollama.',
      503
    );
  }

  let lastError = null;

  /*
   * Explicit provider order:
   *
   * Gemini → Ollama
   *
   * Do not reorder this.
   */
  for (const entry of providers) {
    const { name, provider } = entry;

    try {
      console.log(`[aiService] Trying ${name}.${methodName}`);

      const result = await provider[methodName](params);

      /*
       * Both providers return source: "ai".
       * Keep the existing frontend/database contract unchanged.
       */
      console.log(`[aiService] ${name}.${methodName} succeeded`);

      return result;
    } catch (error) {
      lastError = error;

      /*
       * Never hide a grounding failure.
       */
      if (error instanceof InsufficientDocumentError) {
        throw error;
      }

      if (error.code === 'INSUFFICIENT_DOCUMENT') {
        throw new InsufficientDocumentError(
          'The uploaded document does not contain enough information to generate a valid document-grounded viva question. Try a more detailed document or adjust the interview settings.'
        );
      }

      console.error(
        `[aiService] ${name}.${methodName} failed:`,
        error.message
      );

      /*
       * If Gemini fails, continue to Ollama.
       *
       * This includes:
       * - 429 quota/rate limit
       * - 503 temporary unavailable
       * - network errors
       * - local/provider service errors
       * - malformed provider response
       *
       * If this was already Ollama, the loop simply ends.
       */
      if (name === 'gemini' && shouldFallbackToOllama(error)) {
        const ollamaConfigured = ollamaProvider.isConfigured();

        if (ollamaConfigured) {
          console.warn(
            `[aiService] Gemini unavailable for ${methodName}. ` +
              'Switching automatically to local Ollama.'
          );

          continue;
        }
      }

      /*
       * If Ollama failed, there is no third provider.
       */
      break;
    }
  }

  /*
   * Preserve the existing 429 semantics when Gemini failed because of quota
   * AND Ollama was unavailable/failed.
   */
  if (lastError?.status === 429) {
    throw new AiUnavailableError(
      'Gemini is rate-limited and the local AI fallback is unavailable. Please start Ollama and try again.',
      429
    );
  }

  throw new AiUnavailableError(
    'AI evaluation is temporarily unavailable. Gemini could not respond and the local Ollama fallback is unavailable.',
    503
  );
}

function resolveCategoryBucket(type) {
  /*
   * This helper is only a category mapper.
   * It does NOT generate Mock Interview questions.
   */
  return fallbackProvider.resolveCategoryBucket(type);
}

async function generateQuestion(params) {
  // Every setting and the adaptive plan reach BOTH providers through the same
  // directives block, so a Gemini -> Ollama switch behaves identically.
  return runWithGeminiThenOllama('generateQuestion', {
    ...params,
    directives: policy.questionDirectives({ ...params, purposeKey: params.purposeKey || params.purpose }),
  });
}

function evaluationParams(params) {
  const spoken = policy.isSpokenAnswer(params.mode, params.answerWasSpoken);
  return {
    spoken,
    params: {
      ...params,
      spoken,
      directives: policy.evaluationDirectives({
        purpose: params.purpose,
        level: params.level,
        mode: params.mode,
        spoken,
        mediaMetrics: params.mediaMetrics,
        standalonePractice: params.standalonePractice,
      }),
      standalonePractice: params.standalonePractice === true,
    },
  };
}

async function scoreAnswer(params) {
  const { spoken, params: full } = evaluationParams(params);
  const scored = await runWithGeminiThenOllama('scoreAnswer', full);
  return policy.normalizeScore(scored, { spoken });
}

async function generateMissedAnswerGuidance(params) {
  const scored = await scoreAnswer({
    ...params,
    answerText: '',
    answerWasSpoken: false,
    mode: 'Text Response',
    unanswered: true,
  });

  if (!scored.aiFeedback.trim() || !scored.suggestedAnswer.trim()) {
    throw new Error('AI provider returned empty guidance for an unanswered question');
  }

  return {
    aiFeedback: scored.aiFeedback,
    suggestedAnswer: scored.suggestedAnswer,
  };
}

async function scoreStandalonePractice(params) {
  const { spoken, params: full } = evaluationParams({
    ...params,
    standalonePractice: true,
    answerWasSpoken: false,
    mode: 'text',
  });
  const scored = await runWithGeminiThenOllama('scoreAnswer', full);
  const result = policy.normalizeScore(scored, { spoken });
  result.evidenceFromDocument = [];
  return result;
}

async function generateSessionFeedback(params) {
  return runWithGeminiThenOllama('generateSessionFeedback', params);
}

/**
 * Practice Again deliberately uses Gemini only.
 *
 * Ollama is an automatic fallback for the live Mock Interview pipeline, but
 * Practice Again must not silently switch providers because it is a separate
 * re-attempt flow whose result is compared against the original answer.
 */
async function scorePracticeAnswer(params) {
  if (!geminiProvider.isConfigured()) {
    throw new AiUnavailableError(
      'Gemini is required for Practice Again. Configure GEMINI_API_KEY and try again.',
      503
    );
  }

  try {
    const { spoken, params: full } = evaluationParams(params);
    return policy.normalizeScore(await geminiProvider.scoreAnswer(full), { spoken });
  } catch (error) {
    if (error instanceof InsufficientDocumentError || error?.code === 'INSUFFICIENT_DOCUMENT') {
      throw error instanceof InsufficientDocumentError
        ? error
        : new InsufficientDocumentError(error.message);
    }

    if (error instanceof AiUnavailableError) {
      throw error;
    }

    const status = Number(error?.status);
    if (status === 429) {
      throw new AiUnavailableError(
        'Gemini is temporarily rate-limited. Practice Again cannot use the Ollama fallback; please try again later.',
        429
      );
    }

    throw new AiUnavailableError(
      'Gemini could not evaluate this Practice Again response. Please try again.',
      503
    );
  }
}

async function generateSessionFeedback(params) {
  return runWithGeminiThenOllama(
    'generateSessionFeedback',
    params
  );
}

function getConfiguredProviderNames() {
  return getConfiguredProviders().map(
    (entry) => entry.name
  );
}

module.exports = {
  isRealAiConfigured,
  getConfiguredProviderNames,
  resolveCategoryBucket,
  generateQuestion,
  scoreAnswer,
  generateMissedAnswerGuidance,
  scoreStandalonePractice,
  scorePracticeAnswer,
  generateSessionFeedback,
};