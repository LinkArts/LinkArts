const { Op, where, col, fn } = require('sequelize');
const bcrypt = require('bcryptjs')

const { User, Artist, Establishment, Album, Music, Event, ServiceRequest, Service, ServiceProposal, Report } = require('../models/index');

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
                date: request.createdAt.toLocaleDateString('pt-BR')
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
                include: [
                    {
                        model: User,
                        as: 'Sender',
                        include: [{ model: Artist, required: false }, { model: Establishment, required: false }]
                    },
                    {
                        model: User,
                        as: 'Receiver',
                        include: [{ model: Artist, required: false }, { model: Establishment, required: false }]
                    }
                ],
                order: [['id', 'DESC']]
            });

            const result = proposals.map(proposal => ({
                id: proposal.id,
                title: proposal.name,
                artist: proposal.Sender.Artist ? proposal.Sender.name : (proposal.Receiver.Artist ? proposal.Receiver.name : null),
                establishment: proposal.Sender.Establishment ? proposal.Sender.name : (proposal.Receiver.Establishment ? proposal.Receiver.name : null),
                status: proposal.status === 'accepted' ? 'Aceita' : (proposal.status === 'pending' ? 'Pendente' : 'Recusada'),
                date: proposal.createdAt.toLocaleDateString('pt-BR')
            }));
            return res.json(result);
        } catch (error)
        {
            console.error('Erro ao buscar propostas de serviço:', error);
            return res.status(500).json({ error: 'Erro ao buscar propostas de serviço' });
        }
    }

    static async getAllServices(req, res)
    {
        try
        {
            const services = await Service.findAll({
                include: [
                    {
                        model: User,
                        as: 'Sender',
                        include: [{ model: Artist, required: false }, { model: Establishment, required: false }]
                    },
                    {
                        model: User,
                        as: 'Receiver',
                        include: [{ model: Artist, required: false }, { model: Establishment, required: false }]
                    }
                ],
                order: [['id', 'DESC']]
            });

            const result = services.map(service => ({
                id: service.id,
                title: service.name,
                artist: service.Sender.Artist ? service.Sender.name : (service.Receiver.Artist ? service.Receiver.name : null),
                establishment: service.Sender.Establishment ? service.Sender.name : (service.Receiver.Establishment ? service.Receiver.name : null),
                status: (service.artistStatus === 'confirmed' && service.establishmentStatus === 'confirmed') ? 'Confirmado' : (service.artistStatus === 'cancelled' || service.establishmentStatus === 'cancelled' ? 'Cancelado' : 'Pendente'),
                date: service.createdAt.toLocaleDateString('pt-BR')
            }));

            return res.json(result);
        }
        catch (error)
        {
            console.error('Erro ao buscar serviços:', error);
            return res.status(500).json({ error: 'Erro ao buscar serviços' });
        }
    }

    static async getAllReports(req, res)
    {
        try
        {
            const reports = await Report.findAll({
                include: {model: User, as: 'ReportedUser'},
                order: [['id', 'DESC']]
            });
            const result = reports.map(report => ({
                id: report.id,
                type: report.type === 'chat' ? 'Chat' : 'Perfil',
                reported: report.ReportedUser.name,
                status: report.status === 'resolved' ? 'Resolvido' : 'Pendente',
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

    static async suspendUser(req, res)
    {
        try
        {
            const { id } = req.params;
            const user = await User.findByPk(id);
            if (!user)
            {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }
            user.isSuspended = !user.isSuspended;
            await user.save();
            return res.json({ success: true, isSuspended: user.isSuspended });
        } catch (error)
        {
            console.error('Erro ao suspender usuário:', error);
            return res.status(500).json({ error: 'Erro ao suspender usuário' });
        }
    }

    static async deleteMusic(req, res)
    {
        try
        {
            const { id } = req.params;
            const music = await Music.findByPk(id);
            if (!music)
            {
                return res.status(404).json({ error: 'Música não encontrada' });
            }
            await music.destroy();
            return res.json({ success: true });
        } catch (error)
        {
            console.error('Erro ao deletar música:', error);
            return res.status(500).json({ error: 'Erro ao deletar música' });
        }
    }

    static async deleteAlbum(req, res)
    {
        try
        {
            const { id } = req.params;
            const album = await Album.findByPk(id);
            if (!album)
            {
                return res.status(404).json({ error: 'Álbum não encontrado' });
            }
            await album.destroy();
            return res.json({ success: true });
        } catch (error)
        {
            console.error('Erro ao deletar álbum:', error);
            return res.status(500).json({ error: 'Erro ao deletar álbum' });
        }
    }

    static async deleteEvent(req, res)
    {
        try
        {
            const { id } = req.params;
            const event = await Event.findByPk(id);
            if (!event)
            {
                return res.status(404).json({ error: 'Evento não encontrado' });
            }
            await event.destroy();
            return res.json({ success: true });
        } catch (error)
        {
            console.error('Erro ao deletar evento:', error);
            return res.status(500).json({ error: 'Erro ao deletar evento' });
        }
    }

    static async deleteService(req, res)
    {
        try
        {
            const { id } = req.params;
            const proposal = await ServiceProposal.findByPk(id);
            if (!proposal)
            {
                return res.status(404).json({ error: 'Proposta não encontrada' });
            }
            await proposal.destroy();
            return res.json({ success: true });
        } catch (error)
        {
            console.error('Erro ao deletar proposta de serviço:', error);
            return res.status(500).json({ error: 'Erro ao deletar proposta de serviço' });
        }
    }

    static async deleteServiceRequest(req, res)
    {
        try
        {
            const { id } = req.params;
            const request = await ServiceRequest.findByPk(id);
            if (!request)
            {
                return res.status(404).json({ error: 'Pedido de serviço não encontrado' });
            }
            await request.destroy();
            return res.json({ success: true });
        } catch (error)
        {
            console.error('Erro ao deletar pedido de serviço:', error);
            return res.status(500).json({ error: 'Erro ao deletar pedido de serviço' });
        }
    }

    static async resolveReport(req, res)
    {
        try
        {
            const { id } = req.params;
            const report = await Report.findByPk(id);
            if (!report)
            {
                return res.status(404).json({ error: 'Denúncia não encontrada' });
            }
            report.status = 'resolved';
            await report.save();
            return res.json({ success: true });
        } catch (error)
        {
            console.error('Erro ao resolver denúncia:', error);
            return res.status(500).json({ error: 'Erro ao resolver denúncia' });
        }
    }
}