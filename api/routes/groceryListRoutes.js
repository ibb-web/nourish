const express = require('express');
const {
	getGroceryLists,
	getGroceryListById,
	createGroceryList,
	updateGroceryList,
	deleteGroceryList,
} = require('../controllers/groceryListController');

const router = express.Router();

router.get('/', getGroceryLists);
router.get('/:id', getGroceryListById);
router.post('/', createGroceryList);
router.patch('/:id', updateGroceryList);
router.delete('/:id', deleteGroceryList);

module.exports = router;