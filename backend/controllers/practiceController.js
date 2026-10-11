const aiService = require('../services/aiService');

exports.evaluateAnswer = async (req, res, next) => {
  try {
    const { question, answer, topic, difficulty } = req.body || {};
    if (typeof question !== 'string' || question.trim().length < 5 || question.length > 2000) {
      return res.status(400).json({ message: 'A valid practice question is required' });
    }
    if (typeof answer !== 'string' || answer.trim().length < 2 || answer.length > 12000) {
      return res.status(400).json({ message: 'Enter an answer between 2 and 12,000 characters' });
    }
    if (topic !== undefined && (typeof topic !== 'string' || topic.length > 100)) {
      return res.status(400).json({ message: 'Invalid practice topic' });
    }
    if (difficulty !== undefined && !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
      return res.status(400).json({ message: 'Invalid practice difficulty' });
    }

    const result = await aiService.scoreStandalonePractice({
      questionText: question.trim(),
      answerText: answer.trim(),
      category: topic || 'General',
      difficulty: difficulty || 'Medium',
      type: topic || 'General',
      purpose: 'Standalone Practice',
      level: 'General',
      answerWasSpoken: false,
    });
    return res.json({ result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
};
