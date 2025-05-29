const express = require('express')
const router = express.Router()
const ProfileController = require('../controllers/ProfileController')
const { checkAuth } = require('../middlewares/checkAuth')

router.put('/alterar-perfil', ProfileController.updateProfile)
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

router.get('/eventos', ProfileController.getAllEvents)
router.post('/criar-evento', ProfileController.createEvent)
router.put('/atualizar-evento/:id', ProfileController.updateEvent)
router.delete('/deletar-evento/:id', ProfileController.deleteEvent)

router.get('/pedidos-servico', ProfileController.getAllServiceRequests)
router.post('/criar-pedido-servico', ProfileController.createServiceRequest)
router.put('/atualizar-pedido-servico/:id', ProfileController.updateServiceRequest)
router.delete('/deletar-pedido-servico/:id', ProfileController.deleteServiceRequest)


router.get('/:id', checkAuth, ProfileController.showProfile)

module.exports = router