const { Op, where, col, fn } = require('sequelize');
const bcrypt = require('bcryptjs')

const { User, Artist, Establishment, Album, Music, Event, ServiceRequest, Service, ServiceProposal } = require('../models/index');

module.exports = class AdminController
{
    static async showAdmin(req, res)
    {
        const user = await User.findByPk(req.session.userid)

        if (user.dataValues.isAdmin)
        {
            return res.render('app/admin', { css: 'admin.css' })
        }
        else
        {
            return res.redirect('/dashboard')
        }
    }

    static async getUserStats(req, res)
    {
        try
        {
            const totalArtists = await Artist.count();

            const totalEstablishments = await Establishment.count();

            const totalUsers = totalArtists + totalEstablishments;

            return res.json({
                artists: totalArtists,
                establishments: totalEstablishments,
                total: totalUsers
            });
        } catch (error)
        {
            console.error('Erro ao buscar estatísticas de usuários:', error);
            return res.status(500).json({ error: 'Erro ao buscar estatísticas de usuários' });
        }
    }

    static async getDetailedStats(req, res)
    {
        try
        {
            const [musics, albums, events, serviceRequests, services, concludedServices, cancelledServices] = await Promise.all([
                Music.count(),
                Album.count(),
                Event.count(),
                ServiceRequest.count(),
                Service.count(),
                Service.count({
                    where: {
                        artistStatus: 'confirmed',
                        establishmentStatus: 'confirmed'
                    }
                }),
                Service.count({
                    where: {
                        [Op.or]: [
                            { artistStatus: 'cancelled' },
                            { establishmentStatus: 'cancelled' }
                        ]
                    }
                })
            ]);

            return res.json({
                musics,
                albums,
                events,
                serviceRequests,
                services,
                concludedServices,
                cancelledServices
            });
        } catch (error)
        {
            console.error('Erro ao buscar estatísticas detalhadas:', error);
            return res.status(500).json({ error: 'Erro ao buscar estatísticas detalhadas' });
        }
    }

    static async getRecentUsers(req, res)
    {
        try
        {
            const users = await User.findAll({
                order: [['createdAt', 'DESC']],
                limit: 10,
                include: [
                    { model: Artist, required: false },
                    { model: Establishment, required: false }
                ]
            });

            // Monta o array de resposta
            const result = users.map(user =>
            {
                const createdAt = new Date(user.createdAt);
                const date = createdAt.toLocaleDateString('pt-BR');
                const time = createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return {
                    name: user.name,
                    type: user.Artist ? 'Artista' : (user.Establishment ? 'Estabelecimento' : 'Usuário'),
                    date,
                    time
                };
            });

            return res.json(result);
        } catch (error)
        {
            console.error('Erro ao buscar últimos usuários:', error);
            return res.status(500).json({ error: 'Erro ao buscar últimos usuários' });
        }
    }

    static async getAllUsers(req, res)
    {
        try
        {
            const users = await User.findAll({
                attributes: ['id', 'name', 'email', 'isSuspended'],
                include: [
                    { model: Artist, required: false },
                    { model: Establishment, required: false }
                ],
                order: [['createdAt', 'DESC']]
            });

            const result = users.map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                type: user.Artist ? 'Artista' : (user.Establishment ? 'Estabelecimento' : 'Usuário'),
                status: user.isSuspended
            }));

            return res.json(result);
        }
        catch (error)
        {
            console.error('Erro ao buscar todos os usuários:', error);
            return res.status(500).json({ error: 'Erro ao buscar todos os usuários' });
        }
    }

    static async getAllMusics(req, res)
    {
        try
        {
            const musics = await Music.findAll({
                include: [{ model: Artist, as: 'Artist', include: [{ model: User }], required: false }],
                order: [['id', 'DESC']]
            });
            const result = musics.map(music => ({
                id: music.id,
                title: music.name,
                artist: music.Artist ? music.Artist.User.name : null,
                date: music.createdAt.toLocaleDateString('pt-BR')
            }));
            return res.json(result);
        } catch (error)
        {
            console.error('Erro ao buscar músicas:', error);
            return res.status(500).json({ error: 'Erro ao buscar músicas' });
        }
    }

    static async getAllAlbums(req, res)
    {
        try
        {
            const albums = await Album.findAll({
                include: [{ model: Artist, as: 'Artist', include: [{ model: User }], required: false }],
                order: [['id', 'DESC']]
            });
            const result = albums.map(album => ({
                id: album.id,
                title: album.name,
                artist: album.Artist ? album.Artist.User.name : null,
                date: album.createdAt.toLocaleDateString('pt-BR')
            }));
            return res.json(result);
        } catch (error)
        {
            console.error('Erro ao buscar álbuns:', error);
            return res.status(500).json({ error: 'Erro ao buscar álbuns' });
        }
    }

    static async getAllEvents(req, res)
    {
        try
        {
            const events = await Event.findAll({
                include: [{ model: Establishment, as: 'Establishment', include: [{ model: User }], required: false }],
                order: [['id', 'DESC']]
            });
            const result = events.map(event => ({
                id: event.id,
                title: event.title,
                establishment: event.Establishment ? event.Establishment.User.name : null,
                date: event.createdAt.toLocaleDateString('pt-BR')
            }));
            return res.json(result);
        } catch (error)
        {
            console.error('Erro ao buscar eventos:', error);
            return res.status(500).json({ error: 'Erro ao buscar eventos' });
        }
    }

    static async getAllServiceRequests(req, res)
    {
        try
        {
            const requests = await ServiceRequest.findAll({
                include: [{ model: Establishment, as: 'Establishment', include: [{ model: User }], required: false }],
                order: [['id', 'DESC']]
            });
            const result = requests.map(request => ({
                id: request.id,
                title: request.name,
                establishment: request.Establishment ? request.Establishment.User.name : null,
                date: request.date,
            }));
            return res.json(result);
        } catch (error)
        {
            console.error('Erro ao buscar pedidos de serviço:', error);
            return res.status(500).json({ error: 'Erro ao buscar pedidos de serviço' });
        }
    }

    static async getAllServiceProposals(req, res)
    {
        try
        {
            const proposals = await ServiceProposal.findAll({
                order: [['id', 'DESC']]
            });
            const result = proposals.map(proposal => ({
                id: proposal.id,
                title: proposal.name,
                proponent: proposal.senderUserid,
                price: proposal.price,
                status: proposal.status,
                description: proposal.description
            }));
            return res.json(result);
        } catch (error)
        {
            console.error('Erro ao buscar propostas de serviço:', error);
            return res.status(500).json({ error: 'Erro ao buscar propostas de serviço' });
        }
    }

    static async getAllReports(req, res)
    {
        try
        {
            const Report = require('../models/Report');
            const reports = await Report.findAll({
                order: [['id', 'DESC']]
            });
            const result = reports.map(report => ({
                id: report.id,
                type: report.type,
                reported: report.reportedUserId,
                status: report.status,
                date: report.createdAt,
                reason: report.reason,
                description: report.description
            }));
            return res.json(result);
        } catch (error)
        {
            console.error('Erro ao buscar denúncias:', error);
            return res.status(500).json({ error: 'Erro ao buscar denúncias' });
        }
    }
}