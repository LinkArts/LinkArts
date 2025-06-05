const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middlewares/checkAuth')

const AgendaController = require('../controllers/AgendaController');

// Rotas da agenda
router.get('/agenda/:id', AgendaController.showAgenda);
router.get('/agenda/services/:id', AgendaController.getServices);
router.post('/agenda/notes', checkAuth, AgendaController.saveNotes);
router.post('/agenda/proposal', checkAuth, AgendaController.sendProposal);
router.get('/agenda/proposals', checkAuth, AgendaController.getProposals);
router.post('/agenda/proposals/:id/respond', checkAuth, AgendaController.respondToProposal);
router.post('/agenda/services', checkAuth, AgendaController.createService);
router.put('/agenda/services/:id', checkAuth, AgendaController.updateService);
router.delete('/agenda/services/:id', checkAuth, AgendaController.deleteService);

module.exports = router;
