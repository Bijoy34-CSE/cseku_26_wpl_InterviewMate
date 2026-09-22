const SiteFeedback = require('../models/SiteFeedback');

const ALLOWED_CATEGORIES = ['Bug Report', 'Feature Request', 'General Feedback', 'Praise'];

// POST /api/site-feedback
exports.submitFeedback = async (req, res) => {
  try {
    const { category, rating, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Feedback message is required' });
    }
    if (message.trim().length > 2000) {
      return res.status(400).json({ message: 'Feedback message is too long (max 2000 characters)' });
    }
    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}` });
    }
    if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'rating must be between 1 and 5' });
    }

    const feedback = await SiteFeedback.create({
      user: req.user._id,
      category: category || 'General Feedback',
      rating: rating ?? null,
      message: message.trim(),
    });

    res.status(201).json({
      feedback: {
        id: feedback._id,
        category: feedback.category,
        rating: feedback.rating,
        message: feedback.message,
        createdAt: feedback.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/site-feedback - only this user's own past submissions
exports.listMyFeedback = async (req, res) => {
  try {
    const items = await SiteFeedback.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.status(200).json({
      feedback: items.map((f) => ({
        id: f._id,
        category: f.category,
        rating: f.rating,
        message: f.message,
        createdAt: f.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
