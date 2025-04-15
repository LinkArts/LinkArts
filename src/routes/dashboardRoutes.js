const express = require('express')
const router = express.Router()
const DashboardController = require('../controllers/DashboardController')
const { checkAuth } = require('../middlewares/checkAuth')

router.get('/dashboard', checkAuth, DashboardController.showDashboard)

module.exports = router