const express = require('express');
const router = express.Router();
const {
    getAllReminder,
    addReminder
} = require('../controller/tugas_controller')

const {
    auth,
    register,
    login,
    logout,
    verifyEmail,
    reqEmailVerify,
    resetPassword,
    changePassword,
    getAuth,
} = require('../controller/auth_controller');

const {
    createValidationFor,
    checkValidationResult
} = require('../utils/validationReq');

router.get('/reminder', getAllReminder);
router.post('/reminder', createValidationFor('reminder'), checkValidationResult, addReminder);

router.post('/register', createValidationFor('register'), checkValidationResult, register);
router.post('/login', createValidationFor('login'), checkValidationResult, login);
router.post('/logout', auth, logout);
router.post('/reqverify', createValidationFor('reqverify'), checkValidationResult, reqEmailVerify);
router.post('/getauth', auth, getAuth);
router.post('/verify', createValidationFor('verify'), checkValidationResult, verifyEmail);
router.post('/reset', createValidationFor('reset'), checkValidationResult, resetPassword);
router.put('/reset', createValidationFor('change'), checkValidationResult, changePassword);

module.exports = router;
