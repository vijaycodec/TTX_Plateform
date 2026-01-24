const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { 
  register, 
  login, 
  getMe 
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

// Validation rules
const registerValidation = [
  body('username').not().isEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').not().isEmpty().withMessage('Password is required')
];

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);

module.exports = router;