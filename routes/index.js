const express = require('express');
const router = express.Router();
const tugas_controller = require('../controller/tugas_controller')
const { auth, register, login, logout, verifyEmail, reqEmailVerify, resetPassword, changePassword } = require('../controller/auth_controller');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/tugas', tugas_controller.getAllTugas)
router.get('/tugas/:id', tugas_controller.getTugas)
router.post('/addtugas', tugas_controller.addTugas)
router.get('/db', tugas_controller.getDB)

router.post('/register', register);
router.post('/login', login);
router.get('/logout', auth, logout);
router.post('/verify/:email', reqEmailVerify);
router.get('/verify/:email/:token', verifyEmail);
router.post('/reset/:email', resetPassword);
router.put('/reset', changePassword);

module.exports = router;
