const { Notification } = require('../models/index');
const { getIo } = require('../websocket_setup');

class NotificationHelper {
    /**
     * Cria uma nova notificação no banco de dados
     * @param {number} userId - ID do usuário que receberá a notificação
     * @param {string} type - Tipo da notificação (new_proposal, status_update, password_change)
     * @param {string} title - Título da notificação
     * @param {string} content - Conteúdo da notificação
     * @param {number} referenceId - ID de referência (opcional)
     * @param {string} referenceType - Tipo de referência (opcional)
     * @param {number} senderUserId - ID do usuário remetente (opcional)
     * @returns {Promise<Object>} - A notificação criada
     */
    static async createNotification(userId, type, title, content, referenceId = null, referenceType = null, senderUserId = null) {
        try {
            const notification = await Notification.create({
                user_id: userId,
                type,
                title,
                content,
                reference_id: referenceId,
                reference_type: referenceType,
                is_read: false,
                sender_user_id: senderUserId || null
            });

            this.sendRealTimeNotification(userId, notification);

            return notification;
        } catch (error) {
            console.error('Erro ao criar notificação:', error);
            throw error;
        }
    }

    static sendRealTimeNotification(userId, notification) {
        try {
            const io = getIo();
            io.to(`user_${userId}`).emit('new_notification', {
                id: notification.id,
                type: notification.type,
                title: notification.title,
                content: notification.content,
                is_read: notification.is_read,
                created_at: notification.createdAt,
                reference_id: notification.reference_id,
                reference_type: notification.reference_type
            });
        } catch (error) {
            console.error('Erro ao enviar notificação em tempo real:', error);
        }
    }

    static async notifyNewProposal(userId, proposal, senderUser) {
        const title = 'Nova Proposta Recebida';
        const content = `Você recebeu uma nova proposta para o serviço "${proposal.name}".`;
        return this.createNotification(
            userId, 
            'new_proposal', 
            title, 
            content, 
            proposal.id, 
            'service_proposal',
            senderUser?.id || null
        );
    }

    static async notifyStatusUpdate(userId, service, newStatus, senderUser) {
        const title = 'Status do Serviço Atualizado';
        const content = `O status do serviço "${service.name}" foi alterado para: ${newStatus}.`;
        return this.createNotification(
            userId, 
            'status_update', 
            title, 
            content, 
            service.id, 
            'service',
            senderUser?.id || null
        );
    }

    static async notifyPasswordChange(userId) {
        const title = 'Senha Alterada';
        const content = 'Sua senha foi alterada com sucesso. Se não foi você, entre em contato com o suporte imediatamente.';
        
        return this.createNotification(
            userId, 
            'password_change', 
            title, 
            content,
            null,
            null,
            null
        );
    }

    static async notifyNewRating(userId, rating, senderUser) {
        const title = 'Nova Avaliação Recebida';
        const content = `Você recebeu uma nova avaliação de ${senderUser.name}: "${rating.description || 'Sem comentário'}"`;
        return this.createNotification(
            userId,
            'new_rating',
            title,
            content,
            rating.serviceid,
            'service',
            senderUser.id || null
        );
    }

    static async getUserNotifications(userId, unreadOnly = false, limit = 50) {
        try {
            const whereClause = { user_id: userId };
            if (unreadOnly) {
                whereClause.is_read = false;
            }

            const notifications = await Notification.findAll({
                where: whereClause,
                order: [['createdAt', 'DESC']],
                limit
            });

            return notifications;
        } catch (error) {
            console.error('Erro ao buscar notificações:', error);
            throw error;
        }
    }

    static async markAsRead(notificationId, userId) {
        try {
            const [updatedRows] = await Notification.update(
                { is_read: true },
                { 
                    where: { 
                        id: notificationId, 
                        user_id: userId 
                    } 
                }
            );

            return updatedRows > 0;
        } catch (error) {
            console.error('Erro ao marcar notificação como lida:', error);
            throw error;
        }
    }

    static async markAllAsRead(userId) {
        try {
            const [updatedRows] = await Notification.update(
                { is_read: true },
                { 
                    where: { 
                        user_id: userId, 
                        is_read: false 
                    } 
                }
            );

            return updatedRows;
        } catch (error) {
            console.error('Erro ao marcar todas as notificações como lidas:', error);
            throw error;
        }
    }
}

module.exports = NotificationHelper; 