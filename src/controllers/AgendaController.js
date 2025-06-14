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
            // Verificar se o usuário existe
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

            // Buscar todos os serviços do usuário
            const services = await Service.findAll({
                where: { userid: id },
                include: [
                    { model: Tag, as: 'Tags', required: false },
                    { model: ServiceNote, required: false }
                ]
            });

            // Organizar serviços por data
            const allServices = [];
            services.forEach(service =>
            {
                const serviceData = service.get({ plain: true });

                // Adicionar notas ao serviço
                const notes = serviceData.ServiceNotes && serviceData.ServiceNotes.length > 0
                    ? serviceData.ServiceNotes[0].content
                    : '';

                // Formatar os dados do serviço
                const formattedService = {
                    id: serviceData.id,
                    name: serviceData.name,
                    description: serviceData.description,
                    price: serviceData.price,
                    time: serviceData.time,
                    establishmentName: serviceData.establishmentName,
                    notes: notes,
                    tags: serviceData.Tags || []
                };

                // Adicionar à estrutura organizada por data
                allServices.push(formattedService);
            });

            // Verificar se o usuário logado é o dono da agenda
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
            // Verificar se o serviço existe e pertence ao usuário
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

            // Verificar se já existe uma anotação para este serviço
            const existingNote = await ServiceNote.findOne({
                where: { serviceid: serviceid }
            });

            if (existingNote)
            {
                // Atualizar anotação existente
                await existingNote.update({ content: notes });
                return res.send({ message: "Anotação atualizada com sucesso" });
            } else
            {
                // Criar nova anotação
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

        // Validações básicas
        if (!userid || !date || !name || !description || !price || !startTime || !endTime)
        {
            return res.status(400).json({ message: "Todos os campos são obrigatórios!" });
        }

        try
        {
            // Verificar se o usuário de destino existe
            const targetUser = await User.findByPk(userid);
            if (!targetUser)
            {
                return res.status(404).json({ message: "Usuário de destino não encontrado!" });
            }

            // Verificar se o usuário que está enviando a proposta existe
            const senderUser = await User.findByPk(senderUserid);
            if (!senderUser)
            {
                return res.status(404).json({ message: "Usuário remetente não encontrado!" });
            }

            // Criar a proposta
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
            // Buscar propostas recebidas pelo usuário
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

            // Buscar propostas enviadas pelo usuário
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
        const { action } = req.body; // 'accept' ou 'reject'
        const userid = req.session.userid;

        if (!action || (action !== 'accept' && action !== 'reject'))
        {
            return res.status(400).json({ message: "Ação inválida! Use 'accept' ou 'reject'." });
        }

        try
        {
            // Buscar a proposta
            const proposal = await ServiceProposal.findOne({
                where: {
                    id: id,
                    userid: userid // Garantir que a proposta pertence ao usuário
                }
            });

            if (!proposal)
            {
                return res.status(404).json({ message: "Proposta não encontrada ou não pertence ao usuário!" });
            }

            if (action === 'accept')
            {
                // Atualizar status da proposta
                await proposal.update({ status: 'accepted' });

                // Criar um novo serviço baseado na proposta
                await Service.create({
                    userid: userid, // ID do usuário que recebeu a proposta
                    senderid: proposal.senderUserid, // ID do usuário que enviou a proposta
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
                // Rejeitar a proposta
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

        // Validações básicas
        if (!name || !description || !date)
        {
            return res.status(400).json({ message: "Nome, descrição e data são obrigatórios!" });
        }

        try
        {
            // Criar o serviço
            const service = await Service.create({
                userid: userid,
                name: name,
                description: description,
                price: price || "Não informado",
                date: date,
                time: time || null
            });

            // Adicionar tags se fornecidas
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
            // Buscar o serviço
            const service = await Service.findOne({
                where: {
                    id: id,
                    userid: userid // Garantir que o serviço pertence ao usuário
                }
            });

            if (!service)
            {
                return res.status(404).json({ message: "Serviço não encontrado ou não pertence ao usuário!" });
            }

            // Atualizar o serviço
            await service.update({
                name: name || service.name,
                description: description || service.description,
                price: price || service.price,
                date: date || service.date,
                time: time || service.time
            });

            // Atualizar tags se fornecidas
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
            // Buscar o serviço
            const service = await Service.findOne({
                where: {
                    id: id,
                    userid: userid // Garantir que o serviço pertence ao usuário
                }
            });

            if (!service)
            {
                return res.status(404).json({ message: "Serviço não encontrado ou não pertence ao usuário!" });
            }

            // Excluir anotações relacionadas
            await ServiceNote.destroy({
                where: { serviceid: id }
            });

            // Excluir o serviço
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
            // Verificar se o usuário existe
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

            // Verificar se o usuário logado é o dono da agenda
            const isOwner = req.session.userid === parseInt(id);
            const isNotOwner = !isOwner;

            // Renderizar a página da agenda
            return res.render('app/agenda', {
                userid: id,
                user: user,
                isOwner,
                isNotOwner,
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
