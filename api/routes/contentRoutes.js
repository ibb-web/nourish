const express = require('express');
const { getLandingContent } = require('../controllers/contentController');

const router = express.Router();

router.get('/landing', getLandingContent);

module.exports = router;
