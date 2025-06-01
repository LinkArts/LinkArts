const express = require('express')
const router = express.Router()
const ChatController = require('../controllers/ChatController')
const { checkAuth } = require('../middlewares/checkAuth')

router.get('/chat/:id', checkAuth, ChatController.showChatPage)

module.exports = router