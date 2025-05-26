const express = require('express')
const router = express.Router()
const ProfileController = require('../controllers/ProfileController')

router.get('/albums', ProfileController.getAlbums)
router.get('/procurar-album/:name', ProfileController.searchAlbum)
router.get('/procurar-album-musicas/:id', ProfileController.searchAlbumMusics)
router.get('/procurar-musica/:id', ProfileController.searchMusic)
router.put('/alterar-musica/:id', ProfileController.updateMusic)
router.post('/atualizar-musica/:id', ProfileController.updateMusic)
router.delete('/deletar-musica/:id', ProfileController.deleteMusic)
router.post('/criar-musica', ProfileController.createMusic)
router.post('/criar-album', ProfileController.createAlbum)
router.get('/tags', ProfileController.getTags)
router.get('/:id', ProfileController.showProfile)

module.exports = router