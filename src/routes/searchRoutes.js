const express = require('express')
const router = express.Router()
const SearchController = require('../controllers/SearchController')
const { checkAuth } = require('../middlewares/checkAuth')

router.get('/pesquisar', checkAuth, SearchController.renderSearch)

router.get('/filtrar', checkAuth, SearchController.getFilter)

module.exports = router