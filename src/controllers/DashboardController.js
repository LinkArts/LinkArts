const { Op } = require('sequelize');
const Sequelize = require('sequelize');

const { User, Artist, Establishment, Album, Music, Genre, Tag, Event, ServiceRequest, Service, Rating } = require('../models/index');

module.exports = class DashboardController
{
    static async showDashboard(req, res)
    {
        try {
            // SE O USUARIO ATUAL É ARTISTA
            const isArtist = await Artist.findOne({ 
                where: { userid: req.session.userid },
                include: [{
                    model: User,
                    include: [{ model: Tag, as: 'Tags' }]
                }]
            });

            if (isArtist)
            {
                const userTags = isArtist.User.Tags.map(tag => tag.id);

                const establishments = await Establishment.findAll({
                    include: [
                        {
                            model: User,
                            where: { 
                                isAdmin: false,
                                id: {
                                    [Op.ne]: req.session.userid
                                }
                            },
                            attributes: { exclude: 'password' },
                            include: [
                                { 
                                    model: Tag, 
                                    as: 'Tags',
                                    where: userTags.length > 0 ? {
                                        id: {
                                            [Op.in]: userTags
                                        }
                                    } : undefined
                                }
                            ]
                        }
                    ],
                    attributes: [
                        'cnpj',
                        'userid',
                        'createdAt',
                        'updatedAt'
                    ],
                    group: [
                        'Establishment.cnpj',
                        'Establishment.userid',
                        'Establishment.createdAt',
                        'Establishment.updatedAt',
                        'User.id',
                        'User.Tags.id',
                        'User.Tags->UserTag.userid',
                        'User.Tags->UserTag.tagid'
                    ],
                    having: userTags.length > 0 ? Sequelize.literal('COUNT(DISTINCT "User->Tags"."id") > 0') : undefined
                });

                const agendados = await Service.findAll({
                    where: {
                        [Op.and]: [
                            { artistStatus: 'pending' },
                            {
                                [Op.or]: [
                                    { userid: isArtist.userid },
                                    { senderid: isArtist.userid }
                                ]
                            }
                        ]
                    }
                });

                const services = await ServiceRequest.findAll({
                    attributes: [
                        'id',
                        'name',
                        'description',
                        'date',
                        'startTime',
                        'endTime',
                        'price',
                        'establishmentid',
                        'createdAt',
                        'updatedAt'
                    ],
                    include: [
                        {
                            model: Establishment,
                            attributes: ['cnpj', 'userid'],
                            include: [
                                {
                                    model: User,
                                    attributes: [
                                        'id',
                                        'name',
                                        'email',
                                        'city',
                                        'description',
                                        'imageUrl',
                                        'isAdmin'
                                    ],
                                    include: [
                                        { 
                                            model: Tag, 
                                            as: 'Tags',
                                            attributes: ['id', 'name']
                                        }
                                    ]
                                }
                            ]
                        },
                        { 
                            model: Tag, 
                            as: 'Tags',
                            required: true,
                            attributes: ['id', 'name'],
                            where: {
                                id: {
                                    [Op.in]: userTags
                                }
                            }
                        }
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

                        const commonTags = x.User.Tags.filter(tag => userTags.includes(tag.id)).length;

                        return {
                            ...x.User.toJSON(),
                            Tags: x.User.Tags.map(tag => tag.toJSON()),
                            TotalRatings: totalRatings,
                            AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0,
                            isArtist: false,
                            commonTags
                        };
                    })
                );

                const sortedEstablishments = establishmentPlain.sort((a, b) => b.commonTags - a.commonTags);

                const servicesPlain = await Promise.all(
                    services.map(async (x) => {
                        const totalRatings = await Rating.count({ where: { receiverUserid: x.Establishment.User.id } });
                        const averageRating = await Rating.findOne({
                            where: { receiverUserid: x.Establishment.User.id },
                            attributes: [[Sequelize.fn('AVG', Sequelize.col('rate')), 'averageRating']]
                        });

                        const isInterested = await x.hasArtist(isArtist);

                        const commonTags = x.Tags.filter(tag => userTags.includes(tag.id)).length;

                        return {
                            ...x.toJSON(),
                            Tags: x.Tags.map(tag => tag.toJSON()),
                            Establishment: x.Establishment
                                ? {
                                    ...x.Establishment.toJSON(),
                                    User: x.Establishment.User
                                        ? {
                                            ...x.Establishment.User.toJSON(),
                                            Tags: x.Establishment.User.Tags.map(tag => tag.toJSON()),
                                            TotalRatings: totalRatings,
                                            AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0,
                                        }
                                        : null
                                }
                                : null,
                            isInterested,
                            commonTags
                        };
                    })
                );

                const sortedServices = servicesPlain.sort((a, b) => b.commonTags - a.commonTags);

                const agendadosPlain = agendados.map(x => x.toJSON());

                const userInfo = {
                    establishments: sortedEstablishments,
                    services: sortedServices,
                    agendados: agendadosPlain
                };

                return res.render('app/dashboard', { userInfo, css: 'dashboard.css' });
            }

            // SE O USUARIO ATUAL É ESTABELECIMENTO
            const isEstablishment = await Establishment.findOne({ 
                where: { userid: req.session.userid },
                include: [{
                    model: User,
                    include: [{ model: Tag, as: 'Tags' }]
                }]
            });

            if (isEstablishment)
            {
                const userTags = isEstablishment.User.Tags.map(tag => tag.id);

                const artists = await Artist.findAll({
                    include: [
                        {
                            model: User,
                            where: {
                                id: {
                                    [Op.ne]: req.session.userid
                                }
                            },
                            attributes: { exclude: 'password' },
                            include: [
                                { 
                                    model: Tag, 
                                    as: 'Tags',
                                    where: userTags.length > 0 ? {
                                        id: {
                                            [Op.in]: userTags
                                        }
                                    } : undefined
                                }
                            ]
                        }
                    ],
                    attributes: [
                        'cpf',
                        'userid',
                        'createdAt',
                        'updatedAt'
                    ],
                    group: [
                        'Artist.cpf',
                        'Artist.userid',
                        'Artist.createdAt',
                        'Artist.updatedAt',
                        'User.id',
                        'User.Tags.id',
                        'User.Tags->UserTag.userid',
                        'User.Tags->UserTag.tagid'
                    ],
                    having: userTags.length > 0 ? Sequelize.literal('COUNT(DISTINCT "User->Tags"."id") > 0') : undefined
                });

                const agendados = await Service.findAll({
                    where: {
                        [Op.and]: [
                            { establishmentStatus: 'pending' },
                            {
                                [Op.or]: [
                                    { userid: isEstablishment.userid },
                                    { senderid: isEstablishment.userid }
                                ]
                            }
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

                        const commonTags = x.User.Tags.filter(tag => userTags.includes(tag.id)).length;

                        return {
                            ...x.User.toJSON(),
                            Tags: x.User.Tags.map(tag => tag.toJSON()),
                            TotalRatings: totalRatings,
                            AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0,
                            isArtist: true,
                            commonTags
                        };
                    })
                );

                const sortedArtists = artistsPlain.sort((a, b) => b.commonTags - a.commonTags);

                const agendadosPlain = agendados.map(x => x.toJSON());

                const userInfo = {
                    artists: sortedArtists,
                    agendados: agendadosPlain
                };

                return res.render('app/dashboard', { userInfo, css: 'dashboard.css' });
            }
        } catch (error) {
            console.error('Erro no dashboard:', error);
            return res.status(500).render('layouts/404', {
                message: 'Erro ao carregar o dashboard. Por favor, tente novamente mais tarde.'
            });
        }
    };
}