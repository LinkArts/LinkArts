const express = require('express')
const router = express.Router()
const AuthController = require('../controllers/AuthController')

router.get('/login', AuthController.renderLogin)
router.post('/login', AuthController.postLogin)

router.get('/logout', AuthController.logout)

router.get('/registro-artista', AuthController.renderRegisterArtist)
router.get('/registro-estabelecimento', AuthController.renderRegisterEstablishment)

router.post('/registro-artista', AuthController.postRegisterArtist)
router.post('/registro-estabelecimento', AuthController.postRegisterEstablishment)

router.get('/confirm/:id/:token', AuthController.confirmAccount)

router.get('/alterar-senha', AuthController.renderChangePassword)
router.post('/alterar-senha', AuthController.alterarSenha)

router.post('/enviar-email', AuthController.postVerifyEmail)

module.exports = router