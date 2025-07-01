const { Op, Model, fn, col, where } = require('sequelize');

const { User, Artist, Establishment, Service, ServiceNote, ServiceProposal, Tag } = require('../models/index');
const NotificationHelper = require('../utils/notificationHelper');

module.exports = class AgendaController
{
    static async getServices(req, res)
    {
        const { id } = req.params;

        try
        {
            const user = await User.findOne({
                where: { id: id },
                include: [
                    { model: Artist, required: false },
                    { model: Establishment, required: false }
                ]
            });

            if (!user)
            {
                return res.json({
                    message: "Usuário não encontrado!",
                    services: {}
                });
            }

            // Determina o tipo de usuário
            const isArtist = !!user.Artist;
            const isEstablishment = !!user.Establishment;

            // Define o campo de status com base no tipo de usuário
            const statusField = isArtist ? 'artistStatus' : 'establishmentStatus';

            const services = await Service.findAll({
                where: {
                    [Op.and]: [
                        { [statusField]: 'pending' }, // Filtra serviços com status "pending"
                        {
                            [Op.or]: [
                                { userid: id }, // Serviços recebidos
                                { senderid: id } // Serviços enviados e aceitos
                            ]
                        }
                    ]
                },
                include: [
                    { model: Tag, as: 'Tags', required: false },
                    { model: ServiceNote, required: false },
                    {
                        model: User,
                        as: 'Sender',
                        attributes: ['id', 'name', 'city'] // Inclui informações do remetente
                    },
                    {
                        model: User,
                        as: 'Receiver',
                        attributes: ['id', 'name', 'city'] // Inclui informações do destinatário
                    }
                ]
            });

            const allServices = [];
            services.forEach(service =>
            {
                const serviceData = service.get({ plain: true });

                const notes = serviceData.ServiceNotes && serviceData.ServiceNotes.length > 0
                    ? serviceData.ServiceNotes[0].content
                    : '';

                // Determina quem é o outro usuário relacionado ao serviço
                const otherUser = serviceData.userid === parseInt(id)
                    ? serviceData.Sender
                    : serviceData.Receiver;

                const formattedService = {
                    id: serviceData.id,
                    title: serviceData.name,
                    description: serviceData.description,
                    price: serviceData.price,
                    date: serviceData.date,
                    startTime: serviceData.startTime,
                    endTime: serviceData.endTime,
                    otherUserName: otherUser ? otherUser.name : null,
                    otherUserCity: otherUser ? otherUser.city : null,
                    otherUserId: otherUser ? otherUser.id : null,
                    notes: notes,
                    tags: serviceData.Tags || []
                };

                allServices.push(formattedService);
            });

            const isOwner = req.session.userid === parseInt(id);

            return res.json({
                services: allServices,
                isOwner: isOwner
            });
        } catch (err)
        {
            console.log(err);
            return res.status(500).json({
                message: "Erro ao buscar serviços da agenda!",
                services: {}
            });
        }
    }

    static async saveNotes(req, res)
    {
        const { notes } = req.body;
        const serviceid = req.params.id;
        const userid = req.session.userid;

        if (!notes)
        {
            return res.status(400).json({ message: "Dados de anotações inválidos!" });
        }

        try
        {
            const service = await Service.findOne({
                where: {
                    id: serviceid,
                    userid: userid
                }
            });

            if (!service)
            {
                return res.send({ message: "Serviço não encontrado ou não pertence ao usuário" });
            }

            const existingNote = await ServiceNote.findOne({
                where: { serviceid: serviceid }
            });

            if (existingNote)
            {
                await existingNote.update({ content: notes });
                return res.send({ message: "Anotação atualizada com sucesso" });
            } else
            {
                await ServiceNote.create({
                    serviceid: serviceid,
                    content: notes
                });
                return res.send({ message: "Anotação criada com sucesso" });
            }
        } catch (err)
        {
            console.log(err);
            return res.status(500).json({ message: "Erro ao salvar anotações!" });
        }
    }

    static async sendProposal(req, res)
    {
        const { userid, date, name, description, price, startTime, endTime } = req.body;
        const senderUserid = req.session.userid;

        if (!userid || !date || !name || !description || !price || !startTime || !endTime)
        {
            return res.status(400).json({ message: "Todos os campos são obrigatórios!" });
        }

        try
        {
            const targetUser = await User.findByPk(userid);
            if (!targetUser)
            {
                return res.status(404).json({ message: "Usuário de destino não encontrado!" });
            }

            const senderUser = await User.findByPk(senderUserid);
            if (!senderUser)
            {
                return res.status(404).json({ message: "Usuário remetente não encontrado!" });
            }

            const proposal = await ServiceProposal.create({
                userid: parseInt(userid),
                senderUserid: senderUserid,
                date: date,
                name: name,
                description: description,
                price: price,
                startTime: startTime,
                endTime: endTime,
                status: 'pending' // pending, accepted, rejected
            });

            // Notificar o usuário que recebeu a proposta
            try {
                await NotificationHelper.notifyNewProposal(parseInt(userid), {
                    id: proposal.id,
                    name: proposal.name
                }, senderUser);
            } catch (notificationError) {
                console.error('Erro ao enviar notificação de nova proposta:', notificationError);
            }

            return res.status(201).json({
                message: "Proposta enviada com sucesso!",
                proposal: proposal
            });
        } catch (err)
        {
            console.log(err);
            return res.status(500).json({ message: "Erro ao enviar proposta!" });
        }
    }

    static async getProposals(req, res)
    {
        const userid = req.session.userid;

        try
        {
            const receivedProposals = await ServiceProposal.findAll({
                where: { userid: userid },
                include: [
                    {
                        model: User,
                        as: 'Sender',
                        attributes: ['name', 'city'] // Inclui nome e cidade do remetente
                    }
                ]
            });

            /*const sentProposals = await ServiceProposal.findAll({
                where: { senderUserid: userid },
                include: [
                    {
                        model: User,
                        as: 'Receiver',
                        attributes: ['name', 'city'] // Inclui nome e cidade do destinatário
                    }
                ]
            });*/

            //const sent = [];
            const received = [];

            receivedProposals.forEach(proposal =>
            {
                const proposalData = proposal.get({ plain: true });

                const formattedProposal = {
                    id: proposalData.id,
                    title: proposalData.name,
                    description: proposalData.description,
                    price: proposalData.price,
                    date: proposalData.date,
                    startTime: proposalData.startTime,
                    endTime: proposalData.endTime,
                    senderName: proposalData.Sender ? proposalData.Sender.name : null,
                    senderCity: proposalData.Sender ? proposalData.Sender.city : null,
                    status: proposalData.status || 'pending' // pending, accepted, rejected
                };

                received.push(formattedProposal);
            });

            /*sentProposals.forEach(proposal => {
                const proposalData = proposal.get({ plain: true });
    
                const formattedProposal = {
                    id: proposalData.id,
                    title: proposalData.name,
                    description: proposalData.description,
                    price: proposalData.price,
                    date: proposalData.date,
                    startTime: proposalData.startTime,
                    endTime: proposalData.endTime,
                    receiverName: proposalData.Receiver ? proposalData.Receiver.name : null,
                    receiverCity: proposalData.Receiver ? proposalData.Receiver.city : null,
                    status: proposalData.status || 'pending' // pending, accepted, rejected
                };
    
                allProposals.push(formattedProposal);
            });*/

            const isOwner = userid === req.session.userid;

            return res.json({
                proposals: received,
                isOwner: isOwner
            });
        } catch (err)
        {
            console.log(err);
            return res.status(500).json({ message: "Erro ao buscar propostas!" });
        }
    }

    static async respondToProposal(req, res)
    {
        const { id } = req.params;
        const { action } = req.body;
        const userid = req.session.userid;

        if (!action || (action !== 'accept' && action !== 'reject'))
        {
            return res.status(400).json({ message: "Ação inválida! Use 'accept' ou 'reject'." });
        }

        try
        {
            const proposal = await ServiceProposal.findOne({
                where: {
                    id: id,
                    userid: userid
                }
            });

            if (!proposal)
            {
                return res.status(404).json({ message: "Proposta não encontrada ou não pertence ao usuário!" });
            }

            if (action === 'accept')
            {
                await proposal.update({ status: 'accepted' });

                const service = await Service.create({
                    userid: userid,
                    senderid: proposal.senderUserid,
                    name: proposal.name,
                    description: proposal.description,
                    price: proposal.price,
                    date: proposal.date,
                    startTime: proposal.startTime,
                    endTime: proposal.endTime
                });

                // Notificar o remetente da proposta que ela foi aceita
                try {
                    // Buscar usuário completo do remetente
                    const senderUser = await User.findByPk(proposal.senderUserid);
                    await NotificationHelper.notifyStatusUpdate(proposal.senderUserid, {
                        id: service.id,
                        name: service.name
                    }, 'aceita', senderUser);
                } catch (notificationError) {
                    console.error('Erro ao enviar notificação de status:', notificationError);
                }

                return res.json({ message: "Proposta aceita e serviço criado com sucesso!" });
            } else
            {
                await proposal.update({ status: 'rejected' });
                
                // Notificar o remetente da proposta que ela foi rejeitada
                try {
                    // Buscar usuário completo do remetente
                    const senderUser = await User.findByPk(proposal.senderUserid);
                    await NotificationHelper.notifyStatusUpdate(proposal.senderUserid, {
                        id: proposal.id,
                        name: proposal.name
                    }, 'rejeitada', senderUser);
                } catch (notificationError) {
                    console.error('Erro ao enviar notificação de status:', notificationError);
                }
                
                return res.json({ message: "Proposta rejeitada com sucesso!" });
            }
        } catch (err)
        {
            console.log(err);
            return res.status(500).json({ message: "Erro ao responder à proposta!" });
        }
    }

    static async createService(req, res)
    {
        const { name, description, price, date, time, tags } = req.body;
        const userid = req.session.userid;

        if (!name || !description || !date)
        {
            return res.status(400).json({ message: "Nome, descrição e data são obrigatórios!" });
        }

        try
        {
            const service = await Service.create({
                userid: userid,
                name: name,
                description: description,
                price: price || "Não informado",
                date: date,
                time: time || null
            });

            if (tags && Array.isArray(tags) && tags.length > 0)
            {
                await service.setTags(tags.map(Number));
            }

            return res.status(201).json({
                message: "Serviço criado com sucesso!",
                service: service
            });
        } catch (err)
        {
            console.log(err);
            return res.status(500).json({ message: "Erro ao criar serviço!" });
        }
    }

    static async updateService(req, res)
    {
        const { id } = req.params;
        const { name, description, price, date, time, tags } = req.body;
        const userid = req.session.userid;

        try
        {
            const service = await Service.findOne({
                where: {
                    id: id,
                    userid: userid
                }
            });

            if (!service)
            {
                return res.status(404).json({ message: "Serviço não encontrado ou não pertence ao usuário!" });
            }

            await service.update({
                name: name || service.name,
                description: description || service.description,
                price: price || service.price,
                date: date || service.date,
                time: time || service.time
            });

            if (tags && Array.isArray(tags))
            {
                await service.setTags([]);
                if (tags.length > 0)
                {
                    await service.setTags(tags.map(Number));
                }
            }

            return res.json({
                message: "Serviço atualizado com sucesso!",
                service: service
            });
        } catch (err)
        {
            console.log(err);
            return res.status(500).json({ message: "Erro ao atualizar serviço!" });
        }
    }

    static async deleteService(req, res)
    {
        const { id } = req.params;
        const userid = req.session.userid;

        try
        {
            const service = await Service.findOne({
                where: {
                    id: id,
                    userid: userid
                }
            });

            if (!service)
            {
                return res.status(404).json({ message: "Serviço não encontrado ou não pertence ao usuário!" });
            }

            await ServiceNote.destroy({
                where: { serviceid: id }
            });

            await service.destroy();

            return res.json({ message: "Serviço excluído com sucesso!" });
        } catch (err)
        {
            console.log(err);
            return res.status(500).json({ message: "Erro ao excluir serviço!" });
        }
    }

    static async showAgenda(req, res)
    {
        const { id } = req.params;

        try
        {
            const user = await User.findOne({
                where: { id: id },
                attributes: ['id', 'name', 'email', 'city'],
                include: [
                    { model: Artist, required: false },
                    { model: Establishment, required: false }
                ]
            });

            if (!user)
            {
                req.flash('message', 'Não há um usuário com esse ID!');
                req.flash('messageType', 'notification');

                return req.session.save(() =>
                {
                    if (!req.session.userid)
                        res.redirect('/login');
                    else
                        res.redirect('/dashboard');
                });
            }

            const loggedUser = await User.findOne({
                where: { id: req.session.userid },
                include: [
                    { model: Artist, required: false },
                    { model: Establishment, required: false }
                ]
            });

            if (!loggedUser)
            {
                req.flash('message', 'Usuário logado não encontrado!');
                req.flash('messageType', 'error');
                return req.session.save(() =>
                {
                    res.redirect('/login');
                });
            }

            const isOwner = req.session.userid === parseInt(id);
            const isNotOwner = !isOwner;

            // Verifica se o tipo de usuário é o mesmo
            const isSameType =
                (user.Artist && loggedUser.Artist) ||
                (user.Establishment && loggedUser.Establishment);

            return res.render('app/agenda', {
                userid: id,
                user: user,
                isOwner,
                isNotOwner,
                isSameType, // Envia o boolean ao frontend
                css: 'agenda.css'
            });
        } catch (err)
        {
            console.log(err);
            req.flash('message', 'Algo deu errado!');
            req.flash('messageType', 'error');
            return req.session.save(() =>
            {
                res.redirect('/login');
            });
        }
    }
}
