const express = require('express')
const router = express.Router()
const AuthController = require('../controllers/AuthController')

router.get('/login', AuthController.login)
router.get('/registroArtista', AuthController.registerArtist)
router.get('/registroEstabelecimento', AuthController.registerEstablishment)

router.post('/registroArtista', AuthController.registerArtistPost)
router.post('/registroEstabelecimento', AuthController.registerEstablishmentPost)

module.exports = router