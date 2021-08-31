const express = require('express');
const router = express.Router();
const tugas_controller = require('../controller/tugas_controller')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/tugas', tugas_controller.getAllTugas)
router.get('/tugas/:id', tugas_controller.getTugas)
router.post('/addtugas', tugas_controller.addTugas)

module.exports = router;
