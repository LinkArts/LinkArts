const express = require('express')
const router = express.Router()
const ProfileController = require('../controllers/ProfileController')

router.get('/albums', ProfileController.getAlbums)
router.get('/procurar-album-musicas/:id', ProfileController.searchAlbumMusics)
router.get('/procurar-musica/:id', ProfileController.searchMusic)
router.post('/atualizar-musica/:id', ProfileController.updateMusic)
router.post('/criar-musica', ProfileController.createMusic)
router.post('/criar-album', ProfileController.createAlbum)
router.get('/:id', ProfileController.showProfile)

module.exports = router