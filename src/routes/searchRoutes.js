const express = require('express')
const router = express.Router()
const SearchController = require('../controllers/SearchController')

router.get('/pesquisar', SearchController.renderSearch)

router.get('/filtrar', SearchController.getFilter)

module.exports = router