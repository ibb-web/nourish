const express = require('express');
const {
  listCampaigns,
  createCampaign,
  sendCampaignNow,
} = require('../controllers/emailCampaignController');

const router = express.Router();

router.get('/', listCampaigns);
router.post('/', createCampaign);
router.post('/:id/send', sendCampaignNow);

module.exports = router;
