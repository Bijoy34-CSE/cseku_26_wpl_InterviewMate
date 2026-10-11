const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: ['bkash', 'nagad', 'rocket'], required: true },
    payerNumber: { type: String, trim: true, maxlength: 16, required: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ['BDT'], default: 'BDT' },
    plan: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    providerReference: { type: String, trim: true, maxlength: 120, required: true },
    adminNote: { type: String, trim: true, maxlength: 500 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ provider: 1, providerReference: 1 }, { unique: true });
paymentSchema.index(
  { user: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

module.exports = mongoose.model('Payment', paymentSchema);
