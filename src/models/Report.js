const { DataTypes } = require('sequelize');
const db = require('../db/conn');

const Report = db.define('Report', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    reporterUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    reportedUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    chatId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Chats',
            key: 'id'
        }
    },
    type: {
        type: DataTypes.ENUM('profile', 'chat'),
        allowNull: false,
        defaultValue: 'profile'
    },
    reason: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'reviewed', 'resolved'),
        allowNull: false,
        defaultValue: 'pending'
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
});

module.exports = Report; 