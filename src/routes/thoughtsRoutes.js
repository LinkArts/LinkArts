const express = require('express')
const router = express.Router()
const ThoughtsController = require('../controllers/ThoughtsController')
const checkAuth = require('../helpers/auth').checkAuth
const multer = require('multer')
const path = require('path')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.get('/dashboard', ThoughtsController.dashboard)
router.get('/dashboard/:id', ThoughtsController.dashboardFail)
router.get('/profile/:id',ThoughtsController.viewProfile)
router.get('/profile/:id',ThoughtsController.viewUserProfileById)
router.get('/propostaArtista/:id',ThoughtsController.viewPropostaArtistaById)
router.get('/propostaEmpresa/:id',ThoughtsController.viewPropostaEmpresaById)
router.post('/proposta/:senderId/:receiverId',ThoughtsController.propostaPost)
router.get('/aceitarProposta/:id',ThoughtsController.aceitarProposta)
router.get('/negarProposta/:id',ThoughtsController.negarProposta)
router.get('/404',ThoughtsController.load404)
router.post('/cadastrarEndereco',ThoughtsController.cadastrarEndereco)
router.get('/propostas',ThoughtsController.viewPropostas)

module.exports = router 