const { Report, User, Chat } = require('../models');

module.exports = class ReportController {
    static async createReport(req, res) {
        if (!req.session.userid) {
            return res.status(401).json({ message: "Não autorizado" });
        }

        const reporterUserId = req.session.userid;
        const { reportedUserId, chatId, reason, description, type = 'profile' } = req.body;

        try {
            // Validar se é denúncia de perfil ou chat
            if (type === 'profile' && !reportedUserId) {
                return res.status(400).json({ message: "ID do usuário denunciado é obrigatório para denúncia de perfil." });
            }

            if (type === 'chat' && !chatId) {
                return res.status(400).json({ message: "ID do chat é obrigatório para denúncia de conversa." });
            }

            // Verificar se o usuário não está denunciando a si mesmo
            if (type === 'profile' && reportedUserId === reporterUserId) {
                return res.status(400).json({ message: "Você não pode denunciar seu próprio perfil." });
            }

            // Se for denúncia de chat, verificar se o usuário faz parte da conversa
            if (type === 'chat') {
                const chat = await Chat.findOne({
                    where: { id: chatId },
                    include: [{
                        model: User,
                        where: { id: reporterUserId },
                        attributes: [],
                        through: { attributes: [] }
                    }]
                });

                if (!chat) {
                    return res.status(404).json({ message: "Chat não encontrado ou você não tem acesso a ele." });
                }

                // Para denúncia de chat, encontrar o outro usuário da conversa
                const chatUsers = await chat.getUsers({ attributes: ['id'] });
                const otherUser = chatUsers.find(user => user.id !== reporterUserId);
                
                if (otherUser) {
                    // Adicionar o reportedUserId automaticamente
                    req.body.reportedUserId = otherUser.id;
                }
            }

            // Verificar se já existe denúncia similar
            const existingReport = await Report.findOne({
                where: {
                    reporterUserId: reporterUserId,
                    ...(type === 'profile' ? { reportedUserId: reportedUserId } : { chatId: chatId }),
                    type: type,
                    status: 'pending'
                }
            });

            if (existingReport) {
                return res.status(400).json({ message: `Você já possui uma denúncia pendente para este ${type === 'profile' ? 'perfil' : 'chat'}.` });
            }

            const reportData = {
                reporterUserId: reporterUserId,
                reason: reason,
                description: description || null,
                type: type,
                status: 'pending'
            };

            if (type === 'profile') {
                reportData.reportedUserId = reportedUserId;
            } else {
                reportData.chatId = chatId;
                reportData.reportedUserId = req.body.reportedUserId || null;
            }

            const newReport = await Report.create(reportData);

            return res.status(201).json({ 
                message: `Denúncia de ${type === 'profile' ? 'perfil' : 'conversa'} enviada com sucesso. Obrigado por nos ajudar a manter a comunidade segura.`,
                reportId: newReport.id
            });

        } catch (error) {
            console.error("Erro ao criar denúncia:", error);
            return res.status(500).json({ message: "Erro interno do servidor ao processar denúncia." });
        }
    }

    static async getReports(req, res) {
        if (!req.session.userid) {
            return res.status(401).json({ message: "Não autorizado" });
        }

        // Esta função seria para administradores listarem denúncias
        // Por ora, vamos retornar apenas as denúncias do usuário atual
        const userId = req.session.userid;

        try {
            const reports = await Report.findAll({
                where: { reporterUserId: userId },
                include: [
                    {
                        model: User,
                        as: 'ReportedUser',
                        attributes: ['id', 'name']
                    },
                    {
                        model: Chat,
                        as: 'Chat',
                        attributes: ['id']
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            return res.status(200).json({ reports });

        } catch (error) {
            console.error("Erro ao buscar denúncias:", error);
            return res.status(500).json({ message: "Erro interno do servidor ao buscar denúncias." });
        }
    }
}; 