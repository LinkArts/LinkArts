const express = require('express')
const router = express.Router()
const ServiceController = require('../controllers/ServiceController')
const { checkAuth } = require('../middlewares/checkAuth')

router.get('/servico/:id', ServiceController.showService)
router.put('/responder-servico/:id', ServiceController.answerService);
router.post('/avaliar-servico/:id', ServiceController.rateService);

router.post('/pedido-servico/inscrever/:id', checkAuth, ServiceController.addArtist)
router.delete('/pedido-servico/esquecer/:id', checkAuth, ServiceController.removeArtist);
router.get('/pedido-servico/verificar-interesse/:id', checkAuth, ServiceController.checkArtistInterest);

router.get('/pedido-servico/:id', ServiceController.renderServiceRequest)
router.delete('/pedido-servico/:id', ServiceController.removeServiceRequest)
router.post('/pedido-servico/:id/criar-servico', ServiceController.createService);

module.exports = router