const { Op } = require('sequelize');
const User = require('../models/User');

module.exports = class SearchController
{
    static async renderSearch(req, res)
    {
        const { search } = req.query

        if (search)
        {
            const results = await User.findAll({
                where: {
                    [Op.or]: [
                        { name: { [Op.like]: `%${ search }%` } },
                    ]
                },
                attributes: {exclude: ['password']},
                })

            const userInfo = results.map((result) =>
            {
                return {
                    ...result.dataValues,   // dados do Artist
                }
            });

            return res.render('app/search', { search: search, results: userInfo, css: 'pesquisar.css' })
        }

        return res.render('app/search', { css: 'pesquisar.css' })
    }

    static async getFilter(req, res)
    {
        const { search, type } = req.query

        if (search)
        {
            const results = await User.findAll({
                where: {
                    [Op.or]: [
                        { name: { [Op.like]: `%${ search }%` } },
                    ]
                },
                attributes: ['name']
            })

            return res.render('app/search', { search: search, css: 'pesquisar.css' })
        }

        return res.render('app/search', { css: 'pesquisar.css' })
    }
}