const express = require('express');
const {
	getMealPlans,
	getMealPlanById,
	createMealPlan,
	updateMealPlan,
	deleteMealPlan,
} = require('../controllers/mealPlanController');

const router = express.Router();

router.get('/', getMealPlans);
router.get('/:id/export', require('../controllers/mealPlanController').exportMealPlanCsv);
router.get('/:id', getMealPlanById);
router.post('/', createMealPlan);
router.patch('/:id', updateMealPlan);
router.delete('/:id', deleteMealPlan);

module.exports = router;