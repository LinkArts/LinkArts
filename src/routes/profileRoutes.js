const express = require('express')
const router = express.Router()
const ProfileController = require('../controllers/ProfileController')
const { checkAuth } = require('../middlewares/checkAuth')

router.put('/alterar-perfil', checkAuth, ProfileController.updateProfile)
router.get('/user-data', checkAuth, ProfileController.getUserData)
router.get('/albums', checkAuth, ProfileController.getAlbums)
router.get('/procurar-album/:name', checkAuth, ProfileController.searchAlbum)
router.get('/procurar-album-musicas/:id', checkAuth, ProfileController.searchAlbumMusics)
router.get('/procurar-musica/:id', checkAuth, ProfileController.searchMusic)
router.put('/alterar-musica/:id', checkAuth, ProfileController.updateMusic)
router.post('/atualizar-musica/:id', checkAuth, ProfileController.updateMusic)
router.delete('/deletar-musica/:id', checkAuth, ProfileController.deleteMusic)
router.post('/criar-musica', checkAuth, ProfileController.createMusic)
router.post('/criar-album', checkAuth, ProfileController.createAlbum)
router.post('/atualizar-album-capa', checkAuth, ProfileController.updateAlbumCover)
router.put('/atualizar-album-nome', checkAuth, ProfileController.updateAlbumName)
router.post('/atualizar-musica-capa', checkAuth, ProfileController.updateMusicCover)
router.delete('/deletar-album/:id', checkAuth, ProfileController.deleteAlbum)
router.delete('/remover-musica-album/:albumId/:musicId', checkAuth, ProfileController.removeMusicFromAlbum)
router.get('/tags', checkAuth, ProfileController.getTags)

router.get('/eventos', checkAuth, ProfileController.getAllEvents)
router.post('/criar-evento', checkAuth, ProfileController.createEvent)
router.put('/atualizar-evento/:id', checkAuth, ProfileController.updateEvent)
router.delete('/deletar-evento/:id', checkAuth, ProfileController.deleteEvent)

router.get('/pedidos-servico', ProfileController.getAllServiceRequests)
router.post('/criar-pedido-servico', ProfileController.createServiceRequest)
router.put('/atualizar-pedido-servico/:id', ProfileController.updateServiceRequest)
router.delete('/deletar-pedido-servico/:id', ProfileController.deleteServiceRequest)

router.get('/procurar-favoritos', ProfileController.searchFavorites)
router.post('/adicionar-favorito/:id', ProfileController.addFavorite)

router.get('/reviews/:id', ProfileController.getAllReviews)

router.get('/:id', checkAuth, ProfileController.showProfile)

module.exports = router