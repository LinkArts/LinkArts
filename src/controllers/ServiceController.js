const { Op, where, col, fn, Sequelize } = require('sequelize');
const { emitServiceUpdate } = require('../websocket_setup');

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
                    imageUrl: artist.imageUrl,
                    totalRatings: totalRatingsArtist,
                    averageRating: averageRatingArtistValue
                },
                establishment: {
                    id: establishment.id,
                    name: establishment.name,
                    email: establishment.email,
                    city: establishment.city,
                    description: establishment.description,
                    imageUrl: establishment.imageUrl,
                    totalRatings: totalRatingsEstablishment,
                    averageRating: averageRatingEstablishmentValue
                },
                isRequesterConfirmed: service.requesterConfirmed || false,
                isProviderConfirmed: service.providerConfirmed || false,
                hasBeenReviewed: !!existingRating
            };

            return res.render('app/service', {
                css: 'servico.css',
                additionalCss: 'serviceRealtime.css',
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

            // Emite atualização via WebSocket para todos os usuários conectados ao serviço
            emitServiceUpdate(service.id, {
                artistStatus: service.artistStatus,
                establishmentStatus: service.establishmentStatus,
                isConfirmed: isConfirmed,
                isCancelled: isCancelled,
                timestamp: new Date()
            });

            return res.json({
                message: isConfirmed
                    ? 'Serviço confirmado por ambas as partes!'
                    : isCancelled
                        ? 'Serviço cancelado!'
                        : 'Ação realizada com sucesso!',
                service: service,
                isConfirmed: isConfirmed,
                isCancelled: isCancelled
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

    static async checkArtistInterest(req, res)
    {
        try
        {
            const serviceRequestId = req.params.id;
            const userId = req.session.userid;

            if (!userId)
            {
                return res.status(401).json({ isInterested: false, message: 'Usuário não autenticado.' });
            }

            // Verificar se o usuário é um artista
            const artist = await Artist.findOne({
                where: { userid: userId }
            });

            if (!artist)
            {
                return res.status(200).json({ isInterested: false, message: 'Usuário não é um artista.' });
            }

            // Buscar o pedido de serviço
            const serviceRequest = await ServiceRequest.findByPk(serviceRequestId);

            if (!serviceRequest)
            {
                return res.status(404).json({ isInterested: false, message: 'Pedido de serviço não encontrado.' });
            }

            // Verificar se o artista está interessado
            const isInterested = await serviceRequest.hasArtist(artist);

            return res.status(200).json({ isInterested: isInterested });
        } catch (error)
        {
            console.error('Erro ao verificar interesse:', error);
            return res.status(500).json({ isInterested: false, message: 'Erro interno do servidor.' });
        }
    }

    static async renderServiceRequest(req, res) {
        try {
            const { id } = req.params;

            // Busca simples sem includes complexos primeiro
            const serviceRequest = await ServiceRequest.findByPk(id);

            if (!serviceRequest) {
                return res.status(404).render('app/dashboard', {
                    css: 'dashboard.css',
                });
            }

            // Busca establishment separadamente
            const establishment = await Establishment.findByPk(serviceRequest.establishmentid, {
                include: [{ model: User }]
            });

            if (!establishment || !establishment.User) {
                return res.status(404).render('app/dashboard', {
                    css: 'dashboard.css',
                });
            }

            // Buscar artistas interessados separadamente
            let artists = [];
            try {
                const serviceRequestWithArtists = await ServiceRequest.findByPk(id, {
                    include: [{
                        model: Artist,
                        as: 'Artists',
                        include: [{
                            model: User
                        }]
                    }]
                });

                if (serviceRequestWithArtists && serviceRequestWithArtists.Artists) {
                    
                    artists = await Promise.all(serviceRequestWithArtists.Artists.map(async (artist) => {
                        let totalRatings = 0;
                        let averageRating = 0;
                        
                        try {
                            totalRatings = await Rating.count({ where: { receiverUserid: artist.User.id } }) || 0;
                            const avgRating = await Rating.findOne({
                                where: { receiverUserid: artist.User.id },
                                attributes: [[Sequelize.fn('AVG', Sequelize.col('rate')), 'averageRating']]
                            });
                            averageRating = avgRating && avgRating.dataValues.averageRating
                                ? parseFloat(avgRating.dataValues.averageRating).toFixed(1)
                                : 0;
                        } catch (ratingError) {
                            // Erro silencioso ao buscar ratings
                        }

                        return {
                            id: artist.userid,
                            name: artist.User.name || 'Nome não informado',
                            city: artist.User.city || 'Cidade não informada',
                            profileImg: artist.User.imageUrl || '/img/imgArtista.png',
                            totalRatings: totalRatings,
                            averageRating: averageRating
                        };
                    }));
                }
            } catch (artistError) {
                artists = [];
            }

            // Buscar ratings do estabelecimento
            let totalRatingsEstablishment = 0;
            let averageRatingEstablishment = 0;
            try {
                totalRatingsEstablishment = await Rating.count({ where: { receiverUserid: establishment.User.id } }) || 0;
                const avgRatingEst = await Rating.findOne({
                    where: { receiverUserid: establishment.User.id },
                    attributes: [[Sequelize.fn('AVG', Sequelize.col('rate')), 'averageRating']]
                });
                averageRatingEstablishment = avgRatingEst && avgRatingEst.dataValues.averageRating
                    ? parseFloat(avgRatingEst.dataValues.averageRating).toFixed(1)
                    : 0;
            } catch (ratingError) {
                // Erro silencioso ao buscar ratings do estabelecimento
            }

            // Formatação de data e hora
            const formatTime = (timeString) => {
                if (!timeString) return '';
                const time = timeString.split(':');
                return `${time[0]}:${time[1]}`;
            };

            const formatDate = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                return date.toLocaleDateString('pt-BR');
            };

            const serviceData = {
                id: serviceRequest.id,
                name: serviceRequest.name || 'Serviço sem nome',
                description: serviceRequest.description || 'Sem descrição',
                date: formatDate(serviceRequest.date) || 'Data não informada',
                startTime: formatTime(serviceRequest.startTime) || 'Horário não informado',
                endTime: formatTime(serviceRequest.endTime) || '',
                price: serviceRequest.price || null,
                establishment: {
                    id: establishment.User.id,
                    name: establishment.User.name || 'Nome não informado',
                    city: establishment.User.city || 'Cidade não informada',
                    description: establishment.User.description || 'Sem descrição',
                    profileImg: establishment.User.imageUrl || '/img/imgEmpresa.png',
                    totalRatings: totalRatingsEstablishment,
                    averageRating: averageRatingEstablishment
                },
                artists: artists
            };

            return res.render('app/serviceRequest', {
                css: 'pedidoServico.css',
                serviceRequest: serviceData
            });

        } catch (error) {
            console.error('Erro no renderServiceRequest:', error);
            return res.status(500).render('app/dashboard', {
                css: 'dashboard.css',
                error: 'Erro ao carregar pedido de serviço'
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