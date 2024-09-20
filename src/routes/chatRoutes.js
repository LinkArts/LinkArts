const express = require('express')
const router = express.Router()
const ChatController = require('../controllers/chatController')

router.get('/conversar/:id', ChatController.abrirConversas)

module.exports = router