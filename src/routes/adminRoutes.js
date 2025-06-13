const express = require('express')
const router = express.Router()
const AdminController = require('../controllers/AdminController')
const { checkAuth } = require('../middlewares/checkAuth')

router.get('/admin', AdminController.showAdmin)
//router.put('/responder-servico/:id', ServiceController.answerService)

module.exports = router