const { body } = require('express-validator');

const strongPassword = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/).withMessage('Password needs an uppercase letter')
  .matches(/[a-z]/).withMessage('Password needs a lowercase letter')
  .matches(/\d/).withMessage('Password needs a number');

exports.login = [
  body('loginId').trim().notEmpty().withMessage('College ID is required'),
  body('password').notEmpty().withMessage('Password is required'),
];
exports.forgot = [body('email').isEmail().withMessage('Valid email required').normalizeEmail()];
exports.reset = [body('token').notEmpty().withMessage('Token required'), strongPassword];
exports.changePassword = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password needs an uppercase letter')
    .matches(/[a-z]/).withMessage('Password needs a lowercase letter')
    .matches(/\d/).withMessage('Password needs a number'),
];
exports.updateProfile = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('phone').optional({ checkFalsy: true }).matches(/^[0-9+\-\s]{7,15}$/).withMessage('Invalid phone number'),
];
