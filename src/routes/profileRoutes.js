const express = require('express')
const router = express.Router()
const ProfileController = require('../controllers/ProfileController')

router.get('/:id', ProfileController.showProfile)

module.exports = router