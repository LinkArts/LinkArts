const { Op, where, col, fn } = require('sequelize');
const User = require('../models/User');
const Artist = require('../models/Artist');
const Establishment = require('../models/Establishment');

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
                        where(fn('LOWER', col('name')), {
                            [Op.like]: `%${ search.toLowerCase() }%`
                        })
                    ]
                },
                attributes: { exclude: ['password'] },
            })

            const userInfo = results.map((result) =>
            {
                return {
                    ...result.dataValues,   // dados do Artist
                }
            });

            return res.render('app/search', { search: search, results: userInfo, css: 'pesquisar.css' })
        }

        return res.render('app/search', { search: search, css: 'pesquisar.css' })
    }

    static async getFilter(req, res)
    {
        console.log("GET FILTER");

        const { search, type } = req.query

        const include = []
        if (type === 'artista')
        {
            include.push({ model: Artist, required: true })
        }
        else if (type === 'estabelecimento')
        {
            include.push({ model: Establishment, required: true })
        }
        else
        {
            include.push({ model: Artist, required: false })
            include.push({ model: Establishment, required: false })
        }

        try
        {
            if (search)
            {
                const results = await User.findAll({
                    where:
                    {
                        [Op.or]: [
                            where(fn('LOWER', col('name')), {
                                [Op.like]: `${ search.toLowerCase() }%`
                            })
                        ]
                    },
                    exclude: ['password'],
                    include: include
                })

                const results2 = results.map(result => result.dataValues);

                return res.json({ results2, search: search });
            }
            else
            {
                console.log("SEM SEARCH");
            }
        }
        catch (err)
        {
            console.log(err);
        }

        //return res.render('app/search', { css: 'pesquisar.css' })
    }
}