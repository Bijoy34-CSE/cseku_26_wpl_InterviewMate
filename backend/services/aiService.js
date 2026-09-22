/**
 * AI service abstraction for Mock Interview.
 *
 * IMPORTANT: this file backs Mock Interview ONLY, and Mock Interview uses
 * Gemini 2.5 Flash exclusively. It does NOT fall back to any other provider:
 *   - Not to Anthropic - anthropicProvider.js exists in the codebase but is
 *     deliberately not wired into REAL_PROVIDERS below, so Mock Interview
 *     can never select it (regardless of whether ANTHROPIC_API_KEY happens
 *     to be set). If a second real provider is ever wanted here, add it back
 *     explicitly.
 *   - Not to the heuristic fallbackProvider - that module is reserved for
 *     the separate Practice feature (a static, non-document-grounded
 *     question bank; see services/aiProviders/fallbackProvider.js). Practice
 *     does not currently call this service at all.
 * If Gemini fails (or isn't configured), this throws AiUnavailableError
 * rather than silently degrading to either of those.
 *
 * Every value returned from here carries `source: 'ai'` (added by the
 * provider itself), since a value from this service is never anything else.
 */

const fallbackProvider = require('./aiProviders/fallbackProvider'); // only used here for resolveCategoryBucket() - a deterministic label mapper, not question/score content
const geminiProvider = require('./aiProviders/geminiProvider');
const { InsufficientDocumentError, AiUnavailableError } = require('./aiErrors');

// Gemini 2.5 Flash only - see the file header above for why Anthropic is
// intentionally not included here.
const REAL_PROVIDERS = [{ name: 'gemini', ...geminiProvider }];

function getConfiguredProviders() {
  return REAL_PROVIDERS.filter((provider) => provider.isConfigured());
}

// True if any real AI provider is currently configured.
function isRealAiConfigured() {
  return getConfiguredProviders().length > 0;
}

async function withRealProviderOnly(methodName, params) {
  let lastError = null;

  for (const provider of getConfiguredProviders()) {
    try {
      return await provider[methodName](params);
    } catch (error) {
      // Never silently swap in the generic heuristic here - that would
      // violate the "document is the exclusive knowledge source" rule for
      // Mock Interview. A grounding failure is its own distinct, honest
      // error and must propagate immediately.
      if (error instanceof InsufficientDocumentError) {
        throw error;
      }
      console.error(`[aiService] ${provider.name}.${methodName} failed, trying next provider:`, error.message);
      lastError = error;
    }
  }

  // Every configured provider failed, or none was configured at all.
  console.error(`[aiService] ${methodName} unavailable${lastError ? ': ' + lastError.message : ' (no AI provider configured)'}`);
  throw new AiUnavailableError();
}

// Maps a session's free-form `type` string to one of the fixed question
// categories. Shared across providers so question generation and scoring
// stay consistent for a given session.
function resolveCategoryBucket(type) {
  return fallbackProvider.resolveCategoryBucket(type);
}

async function generateQuestion(params) {
  return withRealProviderOnly('generateQuestion', params);
}

async function scoreAnswer(params) {
  return withRealProviderOnly('scoreAnswer', params);
}

async function generateSessionFeedback(params) {
  return withRealProviderOnly('generateSessionFeedback', params);
}

function getConfiguredProviderNames() {
  return getConfiguredProviders().map((provider) => provider.name);
}

module.exports = {
  isRealAiConfigured,
  getConfiguredProviderNames,
  resolveCategoryBucket,
  generateQuestion,
  scoreAnswer,
  generateSessionFeedback,
};
