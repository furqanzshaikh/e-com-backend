const { Router } = require('express');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

const router = Router();

router.get('/all', getAllUsers);
router.get('/:id', getUserById);
router.post('/create', createUser);
router.patch('/update/:id', updateUser);
router.delete('/delete/:id', deleteUser);

module.exports = router;
