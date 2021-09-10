const express = require('express');
const router = express.Router();
const tugas_controller = require('../controller/tugas_controller')
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
    createValidationFor,
    checkValidationResult
} = require('../controller/auth_controller');

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

router.get('/tugas', tugas_controller.getAllTugas)
router.get('/tugas/:id', tugas_controller.getTugas)
router.post('/addtugas', tugas_controller.addTugas)
router.get('/db', tugas_controller.getDB)

router.post('/register', createValidationFor('register'), checkValidationResult, register);
router.post('/login', createValidationFor('login'), checkValidationResult, login);
router.post('/logout', auth, logout);
router.post('/reqverify', createValidationFor('reqverify'), checkValidationResult, reqEmailVerify);
router.post('/getauth', auth, getAuth);
router.post('/verify', createValidationFor('verify'), checkValidationResult, verifyEmail);
router.post('/reset', createValidationFor('reset'), checkValidationResult, resetPassword);
router.put('/reset', createValidationFor('change'), checkValidationResult, changePassword);

module.exports = router;
