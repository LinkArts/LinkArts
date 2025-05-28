const { DataTypes } = require('sequelize')
const db = require('../db/conn') // Certifique-se de que o caminho para seu arquivo de conexão está correto

const ServiceRequest = db.define('ServiceRequest',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(255), // Nome do pedido de serviço
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT, // Descrição do pedido
            allowNull: true
        },
        date: {
            type: DataTypes.DATEONLY, // Data do pedido
            allowNull: false
        },
        startTime: {
            type: DataTypes.TIME, // Hora de início
            allowNull: false
        },
        endTime: {
            type: DataTypes.TIME, // Hora de término (opcional)
            allowNull: true
        }
    }
)

module.exports = ServiceRequest