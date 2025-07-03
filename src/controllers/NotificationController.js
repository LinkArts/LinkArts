const NotificationHelper = require('../utils/notificationHelper');
const { Notification } = require('../models/index');

module.exports = class NotificationController {
    static async getNotifications(req, res) {
        try {
            const userId = req.session.userid;
            
            if (!userId) {
                return res.status(401).json({ message: 'Usuário não autenticado' });
            }

            const notifications = await NotificationHelper.getUserNotifications(userId);
            
            const senderIds = [...new Set(notifications.map(n => n.sender_user_id).filter(Boolean))];
            let senders = {};
            if (senderIds.length > 0) {
                const { User } = require('../models/index');
                const users = await User.findAll({
                    where: { id: senderIds },
                    attributes: ['id', 'imageUrl', 'name']
                });
                users.forEach(u => {
                    senders[u.id] = u;
                });
            }

            const { ServiceProposal, User } = require('../models/index');
            let proposals = {};
            let proposalClients = {};
            const proposalNotifications = notifications.filter(n => n.type === 'new_proposal' && n.reference_id);
            if (proposalNotifications.length > 0) {
                const proposalIds = proposalNotifications.map(n => n.reference_id);
                const foundProposals = await ServiceProposal.findAll({
                    where: { id: proposalIds },
                    attributes: ['id', 'name', 'userid', 'senderUserid']
                });
                foundProposals.forEach(p => {
                    proposals[p.id] = p;
                });
                const clientIds = [...new Set(foundProposals.map(p => p.senderUserid))];
                if (clientIds.length > 0) {
                    const clients = await User.findAll({
                        where: { id: clientIds },
                        attributes: ['id', 'imageUrl', 'name']
                    });
                    clients.forEach(c => {
                        proposalClients[c.id] = c;
                    });
                }
            }

            return res.json({
                notifications: notifications.map(notification => {
                    let sender_name = notification.sender_user_id && senders[notification.sender_user_id] ? senders[notification.sender_user_id].name : null;
                    let sender_image_url = notification.sender_user_id && senders[notification.sender_user_id] ? senders[notification.sender_user_id].imageUrl : null;
                    let proposal_title = null;
                    if (notification.type === 'new_proposal' && notification.reference_id && proposals[notification.reference_id]) {
                        const proposal = proposals[notification.reference_id];
                        proposal_title = proposal.name;
                        const client = proposalClients[proposal.senderUserid];
                        if (client) {
                            sender_name = client.name;
                            sender_image_url = client.imageUrl;
                        }
                    }
                    return {
                        id: notification.id,
                        type: notification.type,
                        title: notification.title,
                        content: notification.content,
                        is_read: notification.is_read,
                        created_at: notification.createdAt,
                        reference_id: notification.reference_id,
                        reference_type: notification.reference_type,
                        sender_user_id: notification.sender_user_id,
                        sender_image_url,
                        sender_name,
                        proposal_title
                    };
                })
            });
        } catch (error) {
            console.error('Erro ao buscar notificações:', error);
            return res.status(500).json({ message: 'Erro ao buscar notificações' });
        }
    }

    /**
     * Busca apenas notificações não lidas do usuário logado
     */
    static async getUnreadNotifications(req, res) {
        try {
            const userId = req.session.userid;
            
            if (!userId) {
                return res.status(401).json({ message: 'Usuário não autenticado' });
            }

            const notifications = await NotificationHelper.getUserNotifications(userId, true);
            
            return res.json({
                count: notifications.length,
                notifications: notifications.map(notification => ({
                    id: notification.id,
                    type: notification.type,
                    title: notification.title,
                    content: notification.content,
                    is_read: notification.is_read,
                    created_at: notification.createdAt,
                    reference_id: notification.reference_id,
                    reference_type: notification.reference_type,
                    sender_image_url: notification.sender_image_url || null
                }))
            });
        } catch (error) {
            console.error('Erro ao buscar notificações não lidas:', error);
            return res.status(500).json({ message: 'Erro ao buscar notificações não lidas' });
        }
    }

    /**
     * Marca uma notificação específica como lida
     */
    static async markAsRead(req, res) {
        try {
            const userId = req.session.userid;
            const { id } = req.params;
            
            if (!userId) {
                return res.status(401).json({ message: 'Usuário não autenticado' });
            }

            const success = await NotificationHelper.markAsRead(parseInt(id), userId);
            
            if (success) {
                return res.json({ message: 'Notificação marcada como lida' });
            } else {
                return res.status(404).json({ message: 'Notificação não encontrada' });
            }
        } catch (error) {
            console.error('Erro ao marcar notificação como lida:', error);
            return res.status(500).json({ message: 'Erro ao marcar notificação como lida' });
        }
    }

    /**
     * Marca todas as notificações do usuário como lidas
     */
    static async markAllAsRead(req, res) {
        try {
            const userId = req.session.userid;
            
            if (!userId) {
                return res.status(401).json({ message: 'Usuário não autenticado' });
            }

            const updatedCount = await NotificationHelper.markAllAsRead(userId);
            
            return res.json({ 
                message: `${updatedCount} notificações marcadas como lidas`,
                count: updatedCount
            });
        } catch (error) {
            console.error('Erro ao marcar todas as notificações como lidas:', error);
            return res.status(500).json({ message: 'Erro ao marcar todas as notificações como lidas' });
        }
    }

    /**
     * Retorna apenas o contador de notificações não lidas
     */
    static async getUnreadCount(req, res) {
        try {
            const userId = req.session.userid;
            
            if (!userId) {
                return res.status(401).json({ message: 'Usuário não autenticado' });
            }

            const notifications = await NotificationHelper.getUserNotifications(userId, true);
            
            return res.json({
                count: notifications.length
            });
        } catch (error) {
            console.error('Erro ao buscar contador de notificações:', error);
            return res.status(500).json({ message: 'Erro ao buscar contador de notificações' });
        }
    }

    /**
     * Exclui uma notificação específica
     */
    static async deleteNotification(req, res) {
        try {
            const { id } = req.params;
            const userId = req.session.userid;

            const deleted = await Notification.destroy({
                where: {
                    id: id,
                    user_id: userId
                }
            });

            if (deleted) {
                return res.json({ success: true, message: 'Notificação excluída com sucesso' });
            } else {
                return res.status(404).json({ success: false, message: 'Notificação não encontrada' });
            }
        } catch (error) {
            console.error('Erro ao excluir notificação:', error);
            return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
    }

    /**
     * Exclui múltiplas notificações
     */
    static async deleteMultipleNotifications(req, res) {
        try {
            const { notificationIds } = req.body;
            const userId = req.session.userid;

            if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
                return res.status(400).json({ success: false, message: 'IDs de notificações inválidos' });
            }

            const deleted = await Notification.destroy({
                where: {
                    id: notificationIds,
                    user_id: userId
                }
            });

            return res.json({ 
                success: true, 
                message: `${deleted} notificação(ões) excluída(s) com sucesso`,
                deletedCount: deleted
            });
        } catch (error) {
            console.error('Erro ao excluir notificações:', error);
            return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
    }

    /**
     * Redireciona para a ação apropriada baseada no tipo de notificação
     */
    static async redirectNotification(req, res) {
        try {
            const { id } = req.params;
            const userId = req.session.userid;

            const notification = await Notification.findOne({
                where: {
                    id: id,
                    user_id: userId
                }
            });

            if (!notification) {
                return res.status(404).json({ success: false, message: 'Notificação não encontrada' });
            }

            await notification.update({ is_read: true });

            let redirectUrl = '/dashboard';

            switch (notification.type) {
                case 'new_proposal':
                    redirectUrl = `/agenda/${userId}`;
                    break;
                case 'status_update':
                    if (notification.reference_id) {
                        redirectUrl = `/servico/${notification.reference_id}`;
                    } else {
                        redirectUrl = `/agenda/${userId}`;
                    }
                    break;
                case 'password_change':
                    redirectUrl = `/profile/${userId}`;
                    break;
                case 'new_rating':
                    redirectUrl = `/profile/${userId}#avaliacoes`;
                    break;
                default:
                    redirectUrl = '/dashboard';
            }

            return res.json({ success: true, redirectUrl: redirectUrl });
        } catch (error) {
            console.error('Erro ao processar redirecionamento:', error);
            return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
    }
}; 