const User = require('../models/User');
const { sendMail } = require('./emailService');

function buildAudienceQuery(audience = {}) {
  const query = {};
  if (audience.promoOnly !== false) {
    query['notifications.promo'] = true;
  }
  if (Array.isArray(audience.tiers) && audience.tiers.length) {
    query.subscriptionTier = { $in: audience.tiers };
  }
  return query;
}

async function resolveAudience(audience = {}) {
  const query = buildAudienceQuery(audience);
  return User.find(query).select({ _id: 1, name: 1, email: 1, subscriptionTier: 1 });
}

async function sendCampaignToAudience(campaign, options = {}) {
  const dryRun = options.dryRun === true;
  const users = await resolveAudience(campaign.audience || {});

  if (dryRun) {
    return {
      dryRun: true,
      audienceSize: users.length,
      sentCount: 0,
      failedCount: 0,
      sampleRecipients: users.slice(0, 5).map((u) => ({ id: String(u._id), email: u.email })),
    };
  }

  let sentCount = 0;
  let failedCount = 0;
  let lastError = '';

  for (const user of users) {
    try {
      await sendMail({
        to: user.email,
        subject: campaign.subject,
        text: campaign.text || undefined,
        html: campaign.html || undefined,
      });
      sentCount += 1;
    } catch (error) {
      failedCount += 1;
      lastError = error.message || 'Unknown send failure';
    }
  }

  return {
    dryRun: false,
    audienceSize: users.length,
    sentCount,
    failedCount,
    lastError,
  };
}

module.exports = {
  resolveAudience,
  sendCampaignToAudience,
};
