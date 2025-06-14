const { DataTypes } = require('sequelize')
const db = require('../db/conn') // Certifique-se de que o caminho para seu arquivo de conexão está correto

const ServiceProposal = db.define('ServiceProposal', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userid: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    senderUserid: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    startTime: {
        type: DataTypes.TIME,
        allowNull: true
    },
    endTime: {
        type: DataTypes.TIME,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
        defaultValue: 'pending'
    }
});

module.exports = ServiceProposal