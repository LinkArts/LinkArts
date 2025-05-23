const express = require('express')
const router = express.Router()
const ProfileController = require('../controllers/ProfileController')

router.get('/:id', ProfileController.showProfile)
router.post('/salvar-musica', ProfileController.saveMusic)
router.post('/criar-album', ProfileController.createAlbum)

module.exports = router