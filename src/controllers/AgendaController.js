const { Op, Model, fn, col, where } = require('sequelize');

const { User, Artist, Establishment, Service, ServiceNote, ServiceProposal, Tag } = require('../models/index');

module.exports = class AgendaController
{
    static async getServices(req, res)
    {
        console.log("GET SERVICES!!!");
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

            const services = await Service.findAll({
                where: { userid: id },
                include: [
                    { model: Tag, as: 'Tags', required: false },
                    { model: ServiceNote, required: false },
                    {
                        model: User,
                        as: 'Sender', // Relaciona o outro usuário envolvido na proposta
                        attributes: ['name', 'city'] // Inclui nome e cidade do outro usuário
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

                const formattedService = {
                    id: serviceData.id,
                    title: serviceData.name,
                    description: serviceData.description,
                    price: serviceData.price,
                    date: serviceData.date,
                    startTime: serviceData.startTime,
                    endTime: serviceData.endTime,
                    senderName: serviceData.Sender ? serviceData.Sender.name : null,
                    senderCity: serviceData.Sender ? serviceData.Sender.city : null,
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
        console.log("SAVE NOTES!!!");
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
        console.log("SEND PROPOSAL!!!");
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
        console.log("GET PROPOSALS!!!");
        const userid = req.session.userid;

        try
        {
            const receivedProposals = await ServiceProposal.findAll({
                where: { userid: userid },
                include: [
                    {
                        model: User,
                        as: 'Sender',
                        attributes: ['id', 'name', 'email']
                    }
                ]
            });

            const sentProposals = await ServiceProposal.findAll({
                where: { senderUserid: userid },
                include: [
                    {
                        model: User,
                        as: 'Receiver',
                        attributes: ['id', 'name', 'email']
                    }
                ]
            });

            const isOwner = userid === req.session.userid;

            return res.json({
                received: receivedProposals,
                sent: sentProposals,
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
        console.log("RESPOND TO PROPOSAL!!!");
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

                await Service.create({
                    userid: userid,
                    senderid: proposal.senderUserid,
                    name: proposal.name,
                    description: proposal.description,
                    price: proposal.price,
                    date: proposal.date,
                    startTime: proposal.startTime,
                    endTime: proposal.endTime
                });

                return res.json({ message: "Proposta aceita e serviço criado com sucesso!" });
            } else
            {
                await proposal.update({ status: 'rejected' });
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
        console.log("CREATE SERVICE!!!");
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
        console.log("UPDATE SERVICE!!!");
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
        console.log("DELETE SERVICE!!!");
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
        console.log("SHOW AGENDA!!!");
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
