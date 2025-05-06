const express = require('express')
const router = express.Router()
const ProfileController = require('../controllers/ProfileController')

router.get('/:id', ProfileController.showProfile)
router.post('/salvar-musica', ProfileController.saveMusic)

module.exports = router