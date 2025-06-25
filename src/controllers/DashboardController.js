const { Op } = require('sequelize');
const Sequelize = require('sequelize');

const { User, Artist, Establishment, Album, Music, Genre, Tag, Event, ServiceRequest, Service, Rating } = require('../models/index');

module.exports = class DashboardController
{
    static async showDashboard(req, res)
    {
        // SE O USUARIO ATUAL É ARTISTA
        const isArtist = await Artist.findOne({ where: { userid: req.session.userid } });
        if (isArtist)
        {
            const establishments = await Establishment.findAll({
                include: [
                    {
                        model: User,
                        attributes: { exclude: 'password' },
                        include: [
                            { model: Tag, as: 'Tags' } // Inclui as Tags relacionadas ao usuário
                        ]
                    }
                ]
            });

            const agendados = await Service.findAll({
                where: {
                    [Op.or]: [
                        { userid: isArtist.userid },
                        { senderid: isArtist.userid }
                    ]
                }
            });

            const services = await ServiceRequest.findAll({
                include: [
                    {
                        model: Establishment,
                        include: [
                            {
                                model: User,
                                include: [
                                    { model: Tag, as: 'Tags' } // Inclui as Tags relacionadas ao usuário
                                ]
                            }
                        ]
                    },
                    { model: Tag, as: 'Tags' } // Inclui Tags relacionadas ao serviço
                ]
            });

            const establishmentPlain = await Promise.all(
                establishments.map(async (x) =>
                {
                    const totalRatings = await Rating.count({ where: { receiverUserid: x.User.id } });
                    const averageRating = await Rating.findOne({
                        where: { receiverUserid: x.User.id },
                        attributes: [[Sequelize.fn('AVG', Sequelize.col('rate')), 'averageRating']]
                    });

                    return {
                        ...x.User.toJSON(),
                        Tags: x.User.Tags.map(tag => tag.toJSON()), // Inclui as Tags no retorno
                        TotalRatings: totalRatings, // Total de análises recebidas
                        AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0 // Média das análises
                    };
                })
            );

            const servicesPlain = await Promise.all(
                services.map(async (x) =>
                {
                    const totalRatings = await Rating.count({ where: { receiverUserid: x.Establishment.User.id } });
                    const averageRating = await Rating.findOne({
                        where: { receiverUserid: x.Establishment.User.id },
                        attributes: [[Sequelize.fn('AVG', Sequelize.col('rate')), 'averageRating']]
                    });

                    const isInterested = await x.hasArtist(isArtist);

                    return {
                        ...x.toJSON(),
                        Tags: x.Tags.map(tag => tag.toJSON()), // Inclui as Tags no retorno
                        Establishment: x.Establishment
                            ? {
                                ...x.Establishment.toJSON(),
                                User: x.Establishment.User
                                    ? {
                                        ...x.Establishment.User.toJSON(),
                                        Tags: x.Establishment.User.Tags.map(tag => tag.toJSON()), // Inclui as Tags no User do Establishment
                                        TotalRatings: totalRatings, // Total de análises recebidas
                                        AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0 // Média das análises
                                    }
                                    : null
                            }
                            : null,
                        isInterested
                    };
                })
            );

            const agendadosPlain = agendados.map(x => x.toJSON());

            const userInfo = {
                establishments: establishmentPlain,
                services: servicesPlain,
                agendados: agendadosPlain
            };

            //console.log(userInfo);
            return res.render('app/dashboard', { userInfo, css: 'dashboard.css' });
        }

        // SE O USUARIO ATUAL É ESTABELECIMENTO
        const isEstablishment = await Establishment.findOne({ where: { userid: req.session.userid } });
        if (isEstablishment)
        {
            const artists = await Artist.findAll({
                include: [
                    {
                        model: User,
                        attributes: { exclude: 'password' },
                        include: [
                            { model: Tag, as: 'Tags' } // Inclui as Tags relacionadas ao usuário
                        ]
                    }
                ]
            });

            const agendados = await Service.findAll({
                where: {
                    [Op.or]: [
                        { userid: isEstablishment.userid },
                        { senderid: isEstablishment.userid }
                    ]
                }
            });

            const artistsPlain = await Promise.all(
                artists.map(async (x) =>
                {
                    const totalRatings = await Rating.count({ where: { receiverUserid: x.User.id } });
                    const averageRating = await Rating.findOne({
                        where: { receiverUserid: x.User.id },
                        attributes: [[Sequelize.fn('AVG', Sequelize.col('rate')), 'averageRating']]
                    });

                    return {
                        ...x.User.toJSON(),
                        Tags: x.User.Tags.map(tag => tag.toJSON()), // Inclui as Tags no retorno
                        TotalRatings: totalRatings, // Total de análises recebidas
                        AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0 // Média das análises
                    };
                })
            );

            const agendadosPlain = agendados.map(x => x.toJSON());

            const userInfo = {
                artists: artistsPlain,
                agendados: agendadosPlain
            };

            return res.render('app/dashboard', { userInfo, css: 'dashboard.css' });
        }
    }
};