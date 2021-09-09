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
    getAuth
} = require('../controller/auth_controller');

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

router.get('/tugas', tugas_controller.getAllTugas)
router.get('/tugas/:id', tugas_controller.getTugas)
router.post('/addtugas', tugas_controller.addTugas)
router.get('/db', tugas_controller.getDB)

router.post('/register', register);
router.post('/login', login);
router.post('/logout', auth, logout);
router.post('/reqverify', reqEmailVerify);
router.post('/getauth', auth, getAuth);
router.post('/verify', verifyEmail);
router.post('/reset', resetPassword);
router.put('/reset', changePassword);

module.exports = router;
