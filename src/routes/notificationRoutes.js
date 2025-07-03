const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middlewares/checkAuth');
const NotificationController = require('../controllers/NotificationController');

// Alternativa para dizer que todas as rotas desse arquivo executem o middleware 'checkAuth'
router.use(checkAuth);

router.get('/notifications', NotificationController.getNotifications);
router.get('/notifications/unread', NotificationController.getUnreadNotifications);
router.get('/notifications/unread/count', NotificationController.getUnreadCount);
router.patch('/notifications/:id/read', NotificationController.markAsRead);
router.patch('/notifications/read-all', NotificationController.markAllAsRead);
router.get('/notifications/:id/redirect', checkAuth, NotificationController.redirectNotification);
router.delete('/notifications/:id', checkAuth, NotificationController.deleteNotification);
router.delete('/notifications', checkAuth, NotificationController.deleteMultipleNotifications);

module.exports = router; 