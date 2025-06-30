const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Notification = db.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    sender_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        },
        comment: 'ID do usuário remetente da notificação'
    },
    type: {
        type: DataTypes.ENUM('new_proposal', 'status_update', 'password_change', 'new_rating'),
        allowNull: false
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    reference_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID de referência (ex: service_id, service_request_id)'
    },
    reference_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Tipo de referência (ex: service, service_request)'
    }
}, {
    tableName: 'Notifications',
    schema: 'linkarts',
    timestamps: true
});

module.exports = Notification 