const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middlewares/checkAuth')

const AgendaController = require('../controllers/AgendaController');

// Rotas da agenda
router.get('/agenda/:id', AgendaController.showAgenda);
router.get('/agenda/servicos/:id', AgendaController.getServices);
router.get('/agenda/propostas/:id', AgendaController.getProposals);

router.put('/agenda/salvar-anotacao/:id', checkAuth, AgendaController.saveNotes);
router.post('/agenda/enviar-proposta', checkAuth, AgendaController.sendProposal);
router.post('/agenda/proposta/resposta/:id', checkAuth, AgendaController.respondToProposal);
router.post('/agenda/criar-servico', checkAuth, AgendaController.createService);

router.put('/agenda/servico/:id', checkAuth, AgendaController.updateService);
router.delete('/agenda/servico/:id', checkAuth, AgendaController.deleteService);

module.exports = router;

