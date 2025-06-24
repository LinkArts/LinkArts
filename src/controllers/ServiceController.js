const { Op, where, col, fn, Sequelize } = require('sequelize');

const { User, Artist, Establishment, Service, Tag, Rating } = require('../models/index');

module.exports = class ServiceController
{
    static async showService(req, res)
    {
        try
        {
            const serviceId = req.params.id;
            const loggedUserId = req.session.userid;

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

            // Verifica se o usuário logado é o artista ou o estabelecimento
            const isArtist = !!artist && artist.id === loggedUserId;
            const isEstablishment = !!establishment && establishment.id === loggedUserId;


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

            const existingRating = await Rating.findOne({
                where: { serviceid: serviceId, senderUserid: loggedUserId },
            });

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
                artistStatus: service.artistStatus || 'pending',
                establishmentStatus: service.establishmentStatus || 'pending',
                artist: {
                    id: artist.id,
                    name: artist.name,
                    email: artist.email,
                    city: artist.city,
                    description: artist.description,
                    profileImg: artist.profileImg || `https://via.placeholder.com/100/9b87f5/ffffff?text=${ artist.name.charAt(0) }`,
                    totalRatings: totalRatingsArtist,
                    averageRating: averageRatingArtistValue
                },
                establishment: {
                    id: establishment.id,
                    name: establishment.name,
                    email: establishment.email,
                    city: establishment.city,
                    description: establishment.description,
                    profileImg: establishment.profileImg || `https://via.placeholder.com/100/6D28D9/ffffff?text=${ establishment.name.charAt(0) }`,
                    totalRatings: totalRatingsEstablishment,
                    averageRating: averageRatingEstablishmentValue
                },
                isRequesterConfirmed: service.requesterConfirmed || false,
                isProviderConfirmed: service.providerConfirmed || false,
                hasBeenReviewed: !!existingRating
            };

            return res.render('app/service', {
                css: 'servico.css',
                service: formattedService,
                isArtist: isArtist,
                isEstablishment: isEstablishment
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

    static async answerService(req, res)
    {
        try
        {
            const { id } = req.params;
            const { action } = req.body; // 'confirm' ou 'cancel'
            const loggedUserId = req.session.userid;

            const service = await Service.findOne({
                where: { id: id },
                include: [
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
                    }
                ]
            });

            if (!service)
            {
                return res.status(404).json({ message: 'Serviço não encontrado!' });
            }

            // Identifica o artista e o estabelecimento
            const artist = service.Sender.Artist ? service.Sender : service.Receiver;
            const establishment = service.Sender.Establishment ? service.Sender : service.Receiver;

            // Atualiza o status com base no tipo de usuário (artista ou estabelecimento)
            if (artist.id === loggedUserId)
            {
                service.artistStatus = action === 'confirm' ? 'confirmed' : 'cancelled';
            } else if (establishment.id === loggedUserId)
            {
                service.establishmentStatus = action === 'confirm' ? 'confirmed' : 'cancelled';
            } else
            {
                return res.status(403).json({ message: 'Você não está autorizado a realizar esta ação!' });
            }

            await service.save();

            // Verifica se ambos confirmaram ou cancelaram
            const isConfirmed = service.artistStatus === 'confirmed' && service.establishmentStatus === 'confirmed';
            const isCancelled = service.artistStatus === 'cancelled' || service.establishmentStatus === 'cancelled';

            return res.json({
                message: isConfirmed
                    ? 'Serviço confirmado por ambas as partes!'
                    : isCancelled
                        ? 'Serviço cancelado!'
                        : 'Ação realizada com sucesso!',
                service: service,
            });
        } catch (error)
        {
            console.error('Erro ao responder serviço:', error);
            return res.status(500).json({ message: 'Erro ao responder serviço!' });
        }
    }

    static async rateService(req, res)
    {
        try
        {
            const { id } = req.params; // ID do serviço
            const { rating, comment } = req.body; // Dados da avaliação
            const userid = req.session.userid; // ID do usuário logado

            const service = await Service.findOne({
                where: { id: id },
            });

            if (!service)
            {
                return res.status(404).json({ message: 'Serviço não encontrado!' });
            }

            // Verifica se o usuário já avaliou o serviço
            const existingRating = await Rating.findOne({
                where: { serviceid: id, senderUserid: userid },
            });

            if (existingRating)
            {
                return res.status(400).json({ message: 'Você já avaliou este serviço!' });
            }

            // Cria a avaliação
            await Rating.create({
                rate: rating,
                description: comment,
                receiverUserid: service.userid === userid ? service.senderid : service.userid,
                senderUserid: userid,
                serviceid: id, // Preenche o campo serviceid com o ID do serviço
            });

            return res.json({ message: 'Avaliação enviada com sucesso!' });
        } catch (error)
        {
            console.error('Erro ao avaliar serviço:', error);
            return res.status(500).json({ message: 'Erro ao avaliar serviço!' });
        }
    }
}