const express = require('express');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const {
	getFoods,
	searchFoods,
	getFoodById,
	createFood,
	updateFood,
	deleteFood,
} = require('../controllers/foodController');

const router = express.Router();

router.get('/', getFoods);
router.get('/search', searchFoods);
router.get('/:id', validateObjectId, getFoodById);
router.post('/', auth, createFood);
router.put('/:id', auth, validateObjectId, updateFood);
router.patch('/:id', auth, validateObjectId, updateFood);
router.delete('/:id', auth, validateObjectId, deleteFood);

module.exports = router;