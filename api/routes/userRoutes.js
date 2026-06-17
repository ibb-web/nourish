const express = require('express');
const {
	getUsers,
	getUserById,
	createUser,
	updateUser,
	deleteUser,
} = require('../controllers/userController');

const router = express.Router();

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;