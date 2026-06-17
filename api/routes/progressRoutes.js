const express = require('express');
const {
	getProgress,
	getProgressById,
	createProgress,
	updateProgress,
	deleteProgress,
} = require('../controllers/progressController');

const router = express.Router();

router.get('/', getProgress);
router.get('/:id', getProgressById);
router.post('/', createProgress);
router.patch('/:id', updateProgress);
router.delete('/:id', deleteProgress);

module.exports = router;