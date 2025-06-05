const { Op, Model, fn, col, where } = require('sequelize');

const { User, Artist, Establishment, Service, ServiceNote, ServiceProposal, Tag } = require('../models/index');

module.exports = class AgendaController {
    static async getServices(req, res) {
        console.log("GET SERVICES!!!");
        const { id } = req.params;

        try {
            // Verificar se o usuário existe
            const user = await User.findOne({
                where: { id: id },
                include: [
                    { model: Artist, required: false },
                    { model: Establishment, required: false }
                ]
            });

            if (!user) {
                return res.status(404).json({ 
                    message: "Usuário não encontrado!",
                    services: {}
                });
            }

            // Buscar todos os serviços do usuário
            const services = await Service.findAll({
                where: { userId: id },
                include: [
                    { model: Tag, as: 'Tags', required: false },
                    { model: ServiceNote, required: false }
                ]
            });

            // Organizar serviços por data
            const servicesByDate = {};
            services.forEach(service => {
                const serviceData = service.get({ plain: true });
                const dateString = serviceData.date;
                
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
                if (!servicesByDate[dateString]) {
                    servicesByDate[dateString] = [];
                }
                servicesByDate[dateString].push(formattedService);
            });

            // Verificar se o usuário logado é o dono da agenda
            const isOwner = req.session.userid === parseInt(id);

            return res.json({
                services: servicesByDate,
                isOwner: isOwner
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ 
                message: "Erro ao buscar serviços da agenda!",
                services: {}
            });
        }
    }

    static async saveNotes(req, res) {
        console.log("SAVE NOTES!!!");
        const { notes } = req.body;
        const userId = req.session.userid;

        if (!notes || !Array.isArray(notes) || notes.length === 0) {
            return res.status(400).json({ message: "Dados de anotações inválidos!" });
        }

        try {
            // Processar cada anotação
            const results = await Promise.all(notes.map(async (noteData) => {
                const { serviceId, note } = noteData;
                
                // Verificar se o serviço existe e pertence ao usuário
                const service = await Service.findOne({
                    where: { 
                        id: serviceId,
                        userId: userId
                    }
                });

                if (!service) {
                    return { serviceId, success: false, message: "Serviço não encontrado ou não pertence ao usuário" };
                }

                // Verificar se já existe uma anotação para este serviço
                const existingNote = await ServiceNote.findOne({
                    where: { serviceId: serviceId }
                });

                if (existingNote) {
                    // Atualizar anotação existente
                    await existingNote.update({ content: note });
                    return { serviceId, success: true, message: "Anotação atualizada com sucesso" };
                } else {
                    // Criar nova anotação
                    await ServiceNote.create({
                        serviceId: serviceId,
                        content: note
                    });
                    return { serviceId, success: true, message: "Anotação criada com sucesso" };
                }
            }));

            // Verificar se todas as operações foram bem-sucedidas
            const allSuccess = results.every(result => result.success);
            
            if (allSuccess) {
                return res.json({ message: "Todas as anotações foram salvas com sucesso!" });
            } else {
                const failedNotes = results.filter(result => !result.success);
                return res.status(207).json({ 
                    message: "Algumas anotações não puderam ser salvas",
                    details: failedNotes
                });
            }
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: "Erro ao salvar anotações!" });
        }
    }

    static async sendProposal(req, res) {
        console.log("SEND PROPOSAL!!!");
        const { userId, date, name, description, price, time } = req.body;
        const senderUserId = req.session.userid;

        // Validações básicas
        if (!userId || !date || !name || !description || !price || !time) {
            return res.status(400).json({ message: "Todos os campos são obrigatórios!" });
        }

        try {
            // Verificar se o usuário de destino existe
            const targetUser = await User.findByPk(userId);
            if (!targetUser) {
                return res.status(404).json({ message: "Usuário de destino não encontrado!" });
            }

            // Verificar se o usuário que está enviando a proposta existe
            const senderUser = await User.findByPk(senderUserId);
            if (!senderUser) {
                return res.status(404).json({ message: "Usuário remetente não encontrado!" });
            }

            // Criar a proposta
            const proposal = await ServiceProposal.create({
                userId: parseInt(userId),
                senderUserId: senderUserId,
                date: date,
                name: name,
                description: description,
                price: price,
                time: time,
                status: 'pending' // pending, accepted, rejected
            });

            return res.status(201).json({ 
                message: "Proposta enviada com sucesso!",
                proposal: proposal
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: "Erro ao enviar proposta!" });
        }
    }

    static async getProposals(req, res) {
        console.log("GET PROPOSALS!!!");
        const userId = req.session.userid;

        try {
            // Buscar propostas recebidas pelo usuário
            const receivedProposals = await ServiceProposal.findAll({
                where: { userId: userId },
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
                where: { senderUserId: userId },
                include: [
                    { 
                        model: User,
                        as: 'Receiver',
                        attributes: ['id', 'name', 'email']
                    }
                ]
            });

            return res.json({
                received: receivedProposals,
                sent: sentProposals
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: "Erro ao buscar propostas!" });
        }
    }

    static async respondToProposal(req, res) {
        console.log("RESPOND TO PROPOSAL!!!");
        const { id } = req.params;
        const { action } = req.body; // 'accept' ou 'reject'
        const userId = req.session.userid;

        if (!action || (action !== 'accept' && action !== 'reject')) {
            return res.status(400).json({ message: "Ação inválida! Use 'accept' ou 'reject'." });
        }

        try {
            // Buscar a proposta
            const proposal = await ServiceProposal.findOne({
                where: { 
                    id: id,
                    userId: userId // Garantir que a proposta pertence ao usuário
                }
            });

            if (!proposal) {
                return res.status(404).json({ message: "Proposta não encontrada ou não pertence ao usuário!" });
            }

            if (action === 'accept') {
                // Atualizar status da proposta
                await proposal.update({ status: 'accepted' });

                // Criar um novo serviço baseado na proposta
                await Service.create({
                    userId: userId,
                    name: proposal.name,
                    description: proposal.description,
                    price: proposal.price,
                    date: proposal.date,
                    time: proposal.time,
                    establishmentName: `Proposta de ${proposal.senderUserId}` // Pode ser melhorado buscando o nome do remetente
                });

                return res.json({ message: "Proposta aceita e serviço criado com sucesso!" });
            } else {
                // Rejeitar a proposta
                await proposal.update({ status: 'rejected' });
                return res.json({ message: "Proposta rejeitada com sucesso!" });
            }
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: "Erro ao responder à proposta!" });
        }
    }

    static async createService(req, res) {
        console.log("CREATE SERVICE!!!");
        const { name, description, price, date, time, tags } = req.body;
        const userId = req.session.userid;

        // Validações básicas
        if (!name || !description || !date) {
            return res.status(400).json({ message: "Nome, descrição e data são obrigatórios!" });
        }

        try {
            // Criar o serviço
            const service = await Service.create({
                userId: userId,
                name: name,
                description: description,
                price: price || "Não informado",
                date: date,
                time: time || null
            });

            // Adicionar tags se fornecidas
            if (tags && Array.isArray(tags) && tags.length > 0) {
                await service.setTags(tags.map(Number));
            }

            return res.status(201).json({ 
                message: "Serviço criado com sucesso!",
                service: service
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: "Erro ao criar serviço!" });
        }
    }

    static async updateService(req, res) {
        console.log("UPDATE SERVICE!!!");
        const { id } = req.params;
        const { name, description, price, date, time, tags } = req.body;
        const userId = req.session.userid;

        try {
            // Buscar o serviço
            const service = await Service.findOne({
                where: { 
                    id: id,
                    userId: userId // Garantir que o serviço pertence ao usuário
                }
            });

            if (!service) {
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
            if (tags && Array.isArray(tags)) {
                await service.setTags([]);
                if (tags.length > 0) {
                    await service.setTags(tags.map(Number));
                }
            }

            return res.json({ 
                message: "Serviço atualizado com sucesso!",
                service: service
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: "Erro ao atualizar serviço!" });
        }
    }

    static async deleteService(req, res) {
        console.log("DELETE SERVICE!!!");
        const { id } = req.params;
        const userId = req.session.userid;

        try {
            // Buscar o serviço
            const service = await Service.findOne({
                where: { 
                    id: id,
                    userId: userId // Garantir que o serviço pertence ao usuário
                }
            });

            if (!service) {
                return res.status(404).json({ message: "Serviço não encontrado ou não pertence ao usuário!" });
            }

            // Excluir anotações relacionadas
            await ServiceNote.destroy({
                where: { serviceId: id }
            });

            // Excluir o serviço
            await service.destroy();

            return res.json({ message: "Serviço excluído com sucesso!" });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: "Erro ao excluir serviço!" });
        }
    }

    static async showAgenda(req, res) {
        console.log("SHOW AGENDA!!!");
        const { id } = req.params;

        try {
            // Verificar se o usuário existe
            const user = await User.findOne({
                where: { id: id },
                attributes: ['id', 'name', 'email', 'city'],
                include: [
                    { model: Artist, required: false },
                    { model: Establishment, required: false }
                ]
            });

            if (!user) {
                req.flash('message', 'Não há um usuário com esse ID!');
                req.flash('messageType', 'notification');

                return req.session.save(() => {
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
                userId: id,
                user: user,
                isOwner,
                isNotOwner,
                css: 'agenda.css'
            });
        } catch (err) {
            console.log(err);
            req.flash('message', 'Algo deu errado!');
            req.flash('messageType', 'error');
            return req.session.save(() => {
                res.redirect('/login');
            });
        }
    }
}
