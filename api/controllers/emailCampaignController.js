const EmailCampaign = require('../models/EmailCampaign');
const { sendCampaignToAudience } = require('../services/promotionalCampaignService');

const listCampaigns = async (req, res) => {
  try {
    const campaigns = await EmailCampaign.find().sort({ createdAt: -1 });
    return res.json(campaigns);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
};

const createCampaign = async (req, res) => {
  try {
    const payload = {
      name: req.body.name,
      subject: req.body.subject,
      text: req.body.text || '',
      html: req.body.html || '',
      audience: req.body.audience || { promoOnly: true },
      sendAt: req.body.sendAt,
      status: req.body.sendAt ? 'scheduled' : 'draft',
    };
    const campaign = await EmailCampaign.create(payload);
    return res.status(201).json(campaign);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Failed to create campaign' });
  }
};

const sendCampaignNow = async (req, res) => {
  try {
    const campaign = await EmailCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const dryRun = String(req.query.dryRun || req.body?.dryRun || 'false').toLowerCase() === 'true';

    if (!dryRun) {
      campaign.status = 'sending';
      await campaign.save();
    }

    const result = await sendCampaignToAudience(campaign, { dryRun });

    if (!dryRun) {
      campaign.sentCount = result.sentCount;
      campaign.failedCount = result.failedCount;
      campaign.lastError = result.lastError || '';
      campaign.status = result.failedCount > 0 ? 'failed' : 'sent';
      await campaign.save();
    }

    return res.json({
      campaignId: String(campaign._id),
      ...result,
      status: dryRun ? campaign.status : campaign.status,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || 'Failed to send campaign' });
  }
};

module.exports = {
  listCampaigns,
  createCampaign,
  sendCampaignNow,
};
