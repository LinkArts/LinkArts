const express = require('express')
const router = express.Router()
const AuthController = require('../controllers/AuthController')

router.get('/login', AuthController.login)
router.post('/login', AuthController.loginPost)

router.get('/registro-artista', AuthController.registerArtist)
router.get('/registro-estabelecimento', AuthController.registerEstablishment)

router.post('/registro-artista', AuthController.registerArtistPost)
router.post('/registro-estabelecimento', AuthController.registerEstablishmentPost)

module.exports = router