const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middlewares/checkAuth');
const NotificationController = require('../controllers/NotificationController');

// Todas as rotas de notificação requerem autenticação
router.use(checkAuth);

// Buscar todas as notificações do usuário
router.get('/notifications', NotificationController.getNotifications);

// Buscar apenas notificações não lidas
router.get('/notifications/unread', NotificationController.getUnreadNotifications);

// Buscar apenas o contador de notificações não lidas
router.get('/notifications/unread/count', NotificationController.getUnreadCount);

// Marcar uma notificação específica como lida
router.patch('/notifications/:id/read', NotificationController.markAsRead);

// Marcar todas as notificações como lidas
router.patch('/notifications/read-all', NotificationController.markAllAsRead);

// Redirecionar para ação da notificação
router.get('/notifications/:id/redirect', checkAuth, NotificationController.redirectNotification);

// Excluir notificação individual
router.delete('/notifications/:id', checkAuth, NotificationController.deleteNotification);

// Excluir múltiplas notificações
router.delete('/notifications', checkAuth, NotificationController.deleteMultipleNotifications);

module.exports = router; 