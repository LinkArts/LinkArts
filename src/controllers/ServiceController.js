const { Op, where, col, fn, Sequelize } = require('sequelize');

const { User, Artist, Establishment, Service, Tag, Rating } = require('../models/index');

module.exports = class ServiceController
{
    static async showService(req, res)
    {
        try
        {
            const serviceId = req.params.id;

            const service = await Service.findOne({
                where: { id: serviceId },
                include: [
                    {
                        model: User,
                        as: 'Receiver',
                        include: [
                            {
                                model: Artist,
                                required: false
                            },
                            {
                                model: Establishment,
                                required: false
                            }
                        ]
                    },
                    {
                        model: User,
                        as: 'Sender',
                        include: [
                            {
                                model: Artist,
                                required: false
                            },
                            {
                                model: Establishment,
                                required: false
                            }
                        ]
                    },
                    {
                        model: Tag,
                        as: 'Tags',
                        through: { attributes: [] }
                    }
                ]
            });

            if (!service)
            {
                return res.status(404).render('layouts/404', {
                    message: 'Serviço não encontrado',
                });
            }

            // Identifica o artista e o estabelecimento
            const artist = service.Sender.Artist ? service.Sender : service.Receiver;
            const establishment = service.Sender.Establishment ? service.Sender : service.Receiver;

            // Calcula média e total de avaliações para o artista
            const totalRatingsArtist = await Rating.count({ where: { receiverUserid: artist.id } }) || 0;
            const averageRatingArtist = await Rating.findOne({
                where: { receiverUserid: artist.id },
                attributes: [[Sequelize.fn('AVG', Sequelize.col('rate')), 'averageRating']]
            });
            const averageRatingArtistValue = averageRatingArtist && averageRatingArtist.dataValues.averageRating
                ? parseFloat(averageRatingArtist.dataValues.averageRating).toFixed(1)
                : 0;

            // Calcula média e total de avaliações para o estabelecimento
            const totalRatingsEstablishment = await Rating.count({ where: { receiverUserid: establishment.id } }) || 0;
            const averageRatingEstablishment = await Rating.findOne({
                where: { receiverUserid: establishment.id },
                attributes: [[Sequelize.fn('AVG', Sequelize.col('rate')), 'averageRating']]
            });
            const averageRatingEstablishmentValue = averageRatingEstablishment && averageRatingEstablishment.dataValues.averageRating
                ? parseFloat(averageRatingEstablishment.dataValues.averageRating).toFixed(1)
                : 0;

            console.log(totalRatingsArtist);
            console.log(totalRatingsEstablishment)
            console.log(averageRatingArtistValue)
            console.log(averageRatingEstablishmentValue)

            const formattedService = {
                id: service.id,
                title: service.name,
                type: service.Tags.map(tag => tag.name).join(', '),
                description: service.description,
                date: new Date(service.date).toLocaleDateString('pt-BR'),
                startTime: service.startTime,
                endTime: service.endTime,
                price: parseFloat(service.price),
                status: service.status || 'Pendente',
                artist: {
                    id: artist.id,
                    name: artist.name,
                    email: artist.email,
                    city: artist.city,
                    description: artist.description,
                    profileImg: artist.profileImg || `https://via.placeholder.com/100/9b87f5/ffffff?text=${ artist.name.charAt(0) }`,
                    totalRatings: totalRatingsArtist,
                    averageRating: averageRatingArtistValue ? parseFloat(averageRatingArtist.dataValues.averageRating).toFixed(1) : 0
                },
                establishment: {
                    id: establishment.id,
                    name: establishment.name,
                    email: establishment.email,
                    city: establishment.city,
                    description: establishment.description,
                    profileImg: establishment.profileImg || `https://via.placeholder.com/100/6D28D9/ffffff?text=${ establishment.name.charAt(0) }`,
                    totalRatings: totalRatingsEstablishment,
                    averageRating: averageRatingEstablishmentValue ? parseFloat(averageRatingEstablishment.dataValues.averageRating).toFixed(1) : 0
                },
                isRequesterConfirmed: service.requesterConfirmed || false,
                isProviderConfirmed: service.providerConfirmed || false,
                hasBeenReviewed: service.reviewed || false
            };

            return res.render('app/service', {
                css: 'servico.css',
                service: formattedService
            });
        } catch (error)
        {
            console.error('Erro ao buscar serviço:', error);
            return res.status(500).render('error', {
                message: 'Erro ao carregar serviço',
                css: 'error.css'
            });
        }
    }
}