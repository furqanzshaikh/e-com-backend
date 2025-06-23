const { Router } = require('express');
const { register, login,logoutUser, authme } = require('../controllers/authController');
const router = Router();

router.post('/register', register);
router.post('/login', login);


module.exports = router;