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

router.get('/dashboard/:id', ThoughtsController.dashboard)
router.get('/profile/:id',ThoughtsController.viewProfile)
router.get('/profile/:id/:requester',ThoughtsController.viewUserProfileById)
router.get('/propostaArtista/:id/:requester',ThoughtsController.viewPropostaArtistaById)
router.get('/propostaEmpresa/:id/:requester',ThoughtsController.viewPropostaEmpresaById)
router.post('/proposta/:senderId/:receiverId',ThoughtsController.propostaPost)
router.get('/aceitarProposta/:id/:requester',ThoughtsController.aceitarProposta)
router.get('/negarProposta/:id/:requester',ThoughtsController.negarProposta)
router.get('/favoritar/:detentor/:detido',ThoughtsController.favoritar)
router.post('/avaliar/:avaliador/:avaliado',ThoughtsController.avaliar)
router.get('/avaliacoes/:id/:requester',ThoughtsController.viewAvaliacoes)
router.get('/404',ThoughtsController.load404)
router.post('/cadastrarEndereco',ThoughtsController.cadastrarEndereco)
router.post('/cadastrarEvento/:id', upload.single('image'), ThoughtsController.cadastrarEvento)
router.get('/propostas/:id',ThoughtsController.viewPropostas)
router.get('/viewPropostas/:id/:notific',ThoughtsController.openNotificationPropostas)
router.get('/exibirFavoritos/:detentor',ThoughtsController.exibirFavoritos)
router.get('/musicas/:id',ThoughtsController.cadastrarTag)
router.post('/cadastrarTags/:id',ThoughtsController.cadastrarTagPost)
router.post('/criarPasta/:id',ThoughtsController.criarPasta)
router.get('/edit/:id',ThoughtsController.userEdit)
router.post('/edit/:id',upload.single('image'),ThoughtsController.userEditPost)

module.exports = router 