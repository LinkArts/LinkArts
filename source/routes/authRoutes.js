const express = require('express')
const router = express.Router()
const AuthController = require('../controllers/AuthController')
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


router.get('/login', AuthController.login)
router.post('/login',AuthController.loginPost)
router.get('/logout', AuthController.logout)
router.get('/register', AuthController.register)
router.post('/register', upload.single('image'),AuthController.postRegister)
router.post('/resetPassword/:email', AuthController.resetPassword)
router.get('/resetPassword', AuthController.generateToken)

module.exports = router