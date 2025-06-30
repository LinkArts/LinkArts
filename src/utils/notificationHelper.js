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

            // Enviar notificação em tempo real via WebSocket
            this.sendRealTimeNotification(userId, notification);

            return notification;
        } catch (error) {
            console.error('Erro ao criar notificação:', error);
            throw error;
        }
    }

    /**
     * Envia notificação em tempo real via WebSocket
     * @param {number} userId - ID do usuário
     * @param {Object} notification - Dados da notificação
     */
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

    /**
     * Notifica sobre nova proposta de serviço
     * @param {number} userId - ID do usuário que receberá a notificação
     * @param {Object} proposal - Dados da proposta
     * @param {Object} senderUser - Dados do perfil remetente (deve conter id)
     */
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

    /**
     * Notifica sobre mudança de status de serviço
     * @param {number} userId - ID do usuário que receberá a notificação
     * @param {Object} service - Dados do serviço
     * @param {string} newStatus - Novo status
     * @param {Object} senderUser - Dados do perfil remetente (deve conter id)
     */
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

    /**
     * Notifica sobre alteração de senha
     * @param {number} userId - ID do usuário que alterou a senha
     */
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

    /**
     * Notifica sobre nova avaliação recebida
     * @param {number} userId - ID do usuário que receberá a notificação
     * @param {Object} rating - Dados da avaliação (deve conter id, serviceid, rate, description)
     * @param {Object} senderUser - Dados do usuário que enviou a avaliação (deve conter id, name)
     */
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

    /**
     * Busca notificações de um usuário
     * @param {number} userId - ID do usuário
     * @param {boolean} unreadOnly - Se deve buscar apenas não lidas
     * @param {number} limit - Limite de resultados
     * @returns {Promise<Array>} - Lista de notificações
     */
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

    /**
     * Marca notificação como lida
     * @param {number} notificationId - ID da notificação
     * @param {number} userId - ID do usuário (para validação)
     * @returns {Promise<boolean>} - Sucesso da operação
     */
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

    /**
     * Marca todas as notificações de um usuário como lidas
     * @param {number} userId - ID do usuário
     * @returns {Promise<number>} - Número de notificações atualizadas
     */
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