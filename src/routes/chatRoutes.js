const express = require('express')
const router = express.Router()
const ChatController = require('../controllers/chatController')

router.get('/conversar/:id', ChatController.abrirConversas)
router.get('/conversar/:id/:requisitante', ChatController.Conversar)

module.exports = router