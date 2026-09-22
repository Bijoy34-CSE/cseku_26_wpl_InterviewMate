// Thrown when the Gemini provider cannot produce a question it can verify
// is actually supported by the candidate's uploaded document, after
// retrying. This is deliberately NOT caught by aiService's normal
// fallback-to-heuristic-provider path (see aiService.js) - falling back to
// the generic question bank here would silently violate the "document is
// the exclusive knowledge source" requirement. Callers (interviewController)
// catch this specifically and surface a clear, honest error to the user
// instead of a question.
class InsufficientDocumentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InsufficientDocumentError';
  }
}

// Thrown when every configured real AI provider failed (or none is
// configured) for a Mock Interview request. Mock Interview must never
// silently degrade to the generic heuristic fallbackProvider - that module
// is reserved for Practice only (see services/aiProviders/fallbackProvider.js).
// interviewController catches this and returns a clear retry-able error.
class AiUnavailableError extends Error {
  constructor(message = 'AI interview generation is temporarily unavailable. Please retry.') {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

module.exports = { InsufficientDocumentError, AiUnavailableError };
