const express = require('express')
const router = express.Router()
const ServiceController = require('../controllers/ServiceController')
const { checkAuth } = require('../middlewares/checkAuth')

router.get('/servico/:id', ServiceController.showService)
//router.put('/responder-servico/:id', ServiceController.answerService)

module.exports = router