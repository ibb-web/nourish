const mongoose = require('mongoose');

const emailCampaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    text: { type: String, default: '' },
    html: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'],
      default: 'draft',
      index: true,
    },
    audience: {
      promoOnly: { type: Boolean, default: true },
      tiers: [{ type: String, enum: ['Starter', 'Plus', 'Pro'] }],
    },
    sendAt: { type: Date },
    sentCount: { type: Number, default: 0, min: 0 },
    failedCount: { type: Number, default: 0, min: 0 },
    lastError: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailCampaign', emailCampaignSchema);
