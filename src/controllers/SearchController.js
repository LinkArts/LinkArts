const { Op } = require('sequelize');
const User = require('../models/User');

module.exports = class SearchController
{
    static async renderSearch(req, res)
    {
        const search = req.query

        if (search)
        {
            const results = await User.findAll({
                where: {
                    [Op.or]: [
                        { name: { [Op.like]: `%${search}%` } },
                    ]
                },
                attributes: ['name']
            })
        }

        return res.render('app/search', { search: search,  css: 'search.css' })
    }

    static async getFilter(req, res)
    {
        const search = req.query

        if (search)
        {
            const results = await User.findAll({
                where: {
                    [Op.or]: [
                        { name: { [Op.like]: `%${search}%` } },
                    ]
                },
                attributes: ['name']
            })
        }

        return res.render('app/search', { search: search,  css: 'search.css' })
    }
}