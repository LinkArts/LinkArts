const { Op } = require('sequelize');

const User = require("../models/User");
const Artist = require('../models/Artist');
const Establishment = require('../models/Establishment');

module.exports = class DashboardController
{
    static async showDashboard(req, res)
    {
        //SE O USUARIO ATUAL É ARTISTA
        const isArtist = await Artist.findOne({ where: { userid: req.session.userid } })
        if (isArtist)
        {
            const establishments = await Establishment.findAll(
                {
                    include: [{
                        model: User,
                        attributes: { exclude: 'password' }
                    }]
                })

            const userInfo = establishments.map((result) => 
            {
                return {
                    ...result.dataValues,   // dados do Artist
                    ...result.User.dataValues // dados do User associado
                }
            });

            return res.render('app/dashboard', { userInfo, css: 'dashboard.css' })
        }

        //SE O USUARIO ATUAL É ESTABELECIMENTO
        const isEstablishment = await Establishment.findOne({ where: { userid: req.session.userid } })
        if (isEstablishment)
        {
            const artists = await Artist.findAll(
                {
                    include: [{
                        model: User,
                        attributes: { exclude: 'password' }
                    }]
                })

            const userInfo = artists.map((result) => 
            {
                return {
                    ...result.dataValues,   // dados do Artist
                    ...result.User.dataValues // dados do User associado
                }
            });

            return res.render('app/dashboard', { userInfo, css: 'dashboard.css' })
        }

        /*const users = await User.findAll()

        const info = users.map((result) => 
        {
            return result.dataValues
        });

        res.render('app/dashboard', { info, css: 'dashboard.css' })*/
    }
}