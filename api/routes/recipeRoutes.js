const express = require('express');
const auth = require('../middleware/auth');
const {
	getRecipes,
	searchRecipes,
	getRecipeSuggestions,
	getRecipeById,
	createRecipe,
	updateRecipe,
	deleteRecipe,
	getRandomRecipe,
} = require('../controllers/recipeController');

const router = express.Router();

router.get('/', getRecipes);
router.get('/search/suggestions', getRecipeSuggestions);
router.get('/search', searchRecipes);
router.get('/random', getRandomRecipe);
router.get('/:id', getRecipeById);
router.post('/', auth, createRecipe);
router.patch('/:id', auth, updateRecipe);
router.delete('/:id', auth, deleteRecipe);

module.exports = router;