const { Op, where, col, fn, Sequelize } = require('sequelize');

const { User, Artist, Establishment, Service, Tag, Rating, ServiceRequest } = require('../models/index');

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

    static async addArtist(req, res)
    {
        try
        {
            const { id } = req.params; // ID do ServiceRequest
            const loggedUserId = req.session.userid; // ID do usuário logado

            // Verifica se o usuário logado é um artista
            const artist = await Artist.findOne({
                where: { userid: loggedUserId },
            });

            if (!artist)
            {
                return res.json({ message: 'Apenas artistas podem demonstrar interesse em pedidos de serviço!' });
            }

            // Verifica se o ServiceRequest existe
            const serviceRequest = await ServiceRequest.findOne({
                where: { id: id },
            });

            if (!serviceRequest)
            {
                return res.json({ message: 'Pedido de serviço não encontrado!' });
            }

            // Verifica se o artista já está associado ao ServiceRequest
            const existingAssociation = await serviceRequest.hasArtist(artist.dataValues.cpf);

            if (existingAssociation)
            {
                return res.json({ message: 'Você já demonstrou interesse neste pedido de serviço!' });
            }

            // Associa o artista ao ServiceRequest
            await serviceRequest.addArtist(artist);

            return res.json({ message: 'Interesse demonstrado com sucesso!' });
        } catch (error)
        {
            console.error('Erro ao associar artista ao pedido de serviço:', error);
            return res.json({ message: 'Erro ao demonstrar interesse no pedido de serviço!' });
        }
    }

    static async removeArtist(req, res)
    {
        try
        {
            const { id } = req.params; // ID do ServiceRequest
            const loggedUserId = req.session.userid; // ID do usuário logado

            // Verifica se o usuário logado é um artista
            const artist = await Artist.findOne({
                where: { userid: loggedUserId },
            });

            if (!artist)
            {
                return res.json({ message: 'Apenas artistas podem remover interesse em pedidos de serviço!' });
            }

            // Verifica se o ServiceRequest existe
            const serviceRequest = await ServiceRequest.findOne({
                where: { id: id },
            });

            if (!serviceRequest)
            {
                return res.json({ message: 'Pedido de serviço não encontrado!' });
            }

            // Verifica se o artista está associado ao ServiceRequest
            const existingAssociation = await serviceRequest.hasArtist(artist);

            if (!existingAssociation)
            {
                return res.json({ message: 'Você não demonstrou interesse neste pedido de serviço!' });
            }

            // Remove a associação entre o artista e o ServiceRequest
            await serviceRequest.removeArtist(artist);

            return res.json({ message: 'Interesse removido com sucesso!' });
        } catch (error)
        {
            console.error('Erro ao remover interesse do artista no pedido de serviço:', error);
            return res.json({ message: 'Erro ao remover interesse no pedido de serviço!' });
        }
    }

    static async renderServiceRequest(req, res) {
        try {
            const { id } = req.params; // ID do ServiceRequest
            const loggedUserId = req.session.userid;

            // Fetch the ServiceRequest with associated Establishment and Artists
            const serviceRequest = await ServiceRequest.findOne({
                where: { id: id },
                include: [
                    {
                        model: Establishment,
                        include: [
                            {
                                model: User,
                                include: [
                                    { model: Tag, as: 'Tags' } // Include Tags related to the user
                                ]
                            }
                        ]
                    },
                    {
                        model: Artist,
                        as: 'Artists', // Use the alias specified in the association
                        include: [
                            {
                                model: User,
                                include: [
                                    { model: Tag, as: 'Tags' } // Include Tags related to the artist
                                ]
                            }
                        ]
                    }
                ]
            });

            if (!serviceRequest) {
                return res.status(404).render('app/dashboard', {
                    css: 'dashboard.css',
                });
            }

            // Calculate ratings for the establishment
            const establishment = serviceRequest.Establishment.User;
            const totalRatingsEstablishment = await Rating.count({ where: { receiverUserid: establishment.id } }) || 0;
            const averageRatingEstablishment = await Rating.findOne({
                where: { receiverUserid: establishment.id },
                attributes: [[Sequelize.fn('AVG', Sequelize.col('rate')), 'averageRating']]
            });
            const averageRatingEstablishmentValue = averageRatingEstablishment && averageRatingEstablishment.dataValues.averageRating
                ? parseFloat(averageRatingEstablishment.dataValues.averageRating).toFixed(1)
                : 0;

            // Map artists and calculate their ratings
            const artists = await Promise.all(
                serviceRequest.Artists.map(async (artist) => {
                    const totalRatingsArtist = await Rating.count({ where: { receiverUserid: artist.User.id } }) || 0;
                    const averageRatingArtist = await Rating.findOne({
                        where: { receiverUserid: artist.User.id },
                        attributes: [[Sequelize.fn('AVG', Sequelize.col('rate')), 'averageRating']]
                    });
                    const averageRatingArtistValue = averageRatingArtist && averageRatingArtist.dataValues.averageRating
                        ? parseFloat(averageRatingArtist.dataValues.averageRating).toFixed(1)
                        : 0;

                    return {
                        id: artist.userid,
                        name: artist.User.name,
                        city: artist.User.city,
                        profileImg: artist.User.profileImg || `https://via.placeholder.com/100/9b87f5/ffffff?text=${artist.User.name.charAt(0)}`,
                        totalRatings: totalRatingsArtist,
                        averageRating: averageRatingArtistValue
                    };
                })
            );

            return res.render('app/serviceRequest', {
                css: 'pedidoServico.css',
                serviceRequest: {
                    id: serviceRequest.id,
                    title: serviceRequest.title,
                    description: serviceRequest.description,
                    date: serviceRequest.date,
                    startTime: serviceRequest.startTime,
                    endTime: serviceRequest.endTime,
                    price: serviceRequest.price,
                    establishment: {
                        id: establishment.id,
                        name: establishment.name,
                        city: establishment.city,
                        description: establishment.description,
                        profileImg: establishment.profileImg || `https://via.placeholder.com/100/6D28D9/ffffff?text=${establishment.name.charAt(0)}`,
                        totalRatings: totalRatingsEstablishment,
                        averageRating: averageRatingEstablishmentValue
                    },
                    artists
                }
            });
        } catch (error) {
            console.error('Error loading service request:', error);
            return res.status(500).render('app/dashboard', {
                css: 'dashboard.css'
            });
        }
    }

    static async removeServiceRequest(req, res)
    {
        try
        {
            const { id } = req.params; // ID do ServiceRequest

            const serviceRequest = await ServiceRequest.findOne({ where: { id: id } });

            if (!serviceRequest)
            {
                return res.status(404).json({ message: 'Pedido de serviço não encontrado!' });
            }

            await serviceRequest.destroy();

            return res.json({ message: 'Pedido de serviço cancelado com sucesso!' });
        } catch (error)
        {
            console.error('Erro ao cancelar pedido de serviço:', error);
            return res.status(500).json({ message: 'Erro ao cancelar pedido de serviço!' });
        }
    }

    static async createService(req, res) {
        try {
            const { id } = req.params; // ID do ServiceRequest
            const { artistId } = req.body; // ID do artista escolhido
    
            const serviceRequest = await ServiceRequest.findOne({
                where: { id: id },
                include: [{ model: Establishment }]
            });
    
            if (!serviceRequest) {
                return res.status(404).json({ message: 'Pedido de serviço não encontrado!' });
            }
    
            const artist = await Artist.findOne({ where: { userid: artistId } });
    
            if (!artist) {
                return res.status(404).json({ message: 'Artista não encontrado!' });
            }

            // Cria o serviço
            await Service.create({
                name: serviceRequest.name,
                description: serviceRequest.description,
                date: serviceRequest.date,
                startTime: serviceRequest.startTime,
                endTime: serviceRequest.endTime,
                price: serviceRequest.price,
                senderid: serviceRequest.Establishment.userid,
                userid: artist.userid
            });
    
            // Remove o pedido de serviço
            await serviceRequest.destroy();
    
            return res.json({ message: 'Serviço criado com sucesso!' });
        } catch (error) {
            console.error('Erro ao criar serviço:', error);
            return res.status(500).json({ message: 'Erro ao criar serviço!' });
        }
    }
}