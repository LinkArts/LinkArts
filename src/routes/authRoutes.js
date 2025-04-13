const express = require('express')
const router = express.Router()
const AuthController = require('../controllers/AuthController')
const { sendEmail } = require('../utils/mailer')

router.get('/login', AuthController.login)
router.post('/login', AuthController.loginPost)

router.get('/logout', AuthController.logout)

router.get('/registro-artista', AuthController.registerArtist)
router.get('/registro-estabelecimento', AuthController.registerEstablishment)

router.post('/registro-artista', AuthController.registerArtistPost)
router.post('/registro-estabelecimento', AuthController.registerEstablishmentPost)

router.get('/email')
router.post('/email', () =>
{
    sendEmail("kevincaireleandro@hotmail.com", "Teste123", `<h1>TESTE</h1>`)
})

module.exports = router