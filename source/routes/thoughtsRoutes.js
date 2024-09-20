const express = require('express')
const router = express.Router()
const ThoughtsController = require('../controllers/ThoughtsController')
const ProfileController = require('../controllers/ProfileController')
const PropostaController = require('../controllers/PropostaController')
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

router.get('/dashboard/:id', ThoughtsController.dashboard)
router.get('/profile/:id',ProfileController.viewProfile)
router.get('/profile/:id/:requester',ProfileController.viewUserProfileById)
router.get('/propostaArtista/:id/:requester',PropostaController.viewPropostaArtistaById)
router.get('/propostaEmpresa/:id/:requester',PropostaController.viewPropostaEmpresaById)
router.post('/proposta/:senderId/:receiverId',PropostaController.propostaPost)
router.get('/aceitarProposta/:id/:requester',PropostaController.aceitarProposta)
router.get('/negarProposta/:id/:requester',PropostaController.negarProposta)
router.get('/favoritar/:detentor/:detido',ProfileController.favoritar)
router.post('/avaliar/:avaliador/:avaliado',ProfileController.avaliar)
router.get('/avaliacoes/:id/:requester',ProfileController.viewAvaliacoes)
router.get('/404',ThoughtsController.load404)
router.post('/cadastrarEndereco',ProfileController.cadastrarEndereco)
router.post('/cadastrarEvento/:id', upload.single('image'), ProfileController.cadastrarEvento)
router.get('/propostas/:id',PropostaController.viewPropostas)
router.get('/viewPropostas/:id/:notific',PropostaController.openNotificationPropostas)
router.get('/exibirFavoritos/:detentor',ProfileController.exibirFavoritos)
router.get('/musicas/:id',ProfileController.cadastrarTag)
router.post('/cadastrarTags/:id',ProfileController.cadastrarTagPost)
router.post('/criarPasta/:id',ProfileController.criarPasta)
router.get('/edit/:id',ProfileController.userEdit)
router.post('/edit/:id',upload.single('image'),ProfileController.userEditPost)

module.exports = router 