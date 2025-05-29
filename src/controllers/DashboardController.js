const { Op } = require('sequelize');

const { User, Artist, Establishment, Album, Music, Genre, Tag, Event, ServiceRequest } = require('../models/index');

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

            const services = await ServiceRequest.findAll()
            const establishmentPlain = establishments.map(x => x.User.toJSON())
            const servicesPlain = services.map(x => x.toJSON())

            const userInfo = {
                establishments: establishmentPlain,
                services: servicesPlain
            }

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


            const userInfo =
            {
                artists: artists.map(x => x.User.toJSON())
            }


            return res.render('app/dashboard', { userInfo, css: 'dashboard.css' })
        }
    }
}