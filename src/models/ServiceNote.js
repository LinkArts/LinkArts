const { DataTypes } = require('sequelize')
const db = require('../db/conn') // Certifique-se de que o caminho para seu arquivo de conexão está correto

const ServiceNote = db.define('ServiceNote', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    serviceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Services',
            key: 'id'
        }
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

module.exports = ServiceNote