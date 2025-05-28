const { DataTypes } = require('sequelize')
const db = require('../db/conn') // Certifique-se de que o caminho para seu arquivo de conexão está correto

const Event = db.define('Event',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false // É 'allowNull' em Sequelize, não 'require'
        },
        title: {
            type: DataTypes.STRING(255), // Título do evento
            allowNull: false
        },
        date: {
            type: DataTypes.DATEONLY, // Armazena apenas a data (YYYY-MM-DD)
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT, // Use TEXT para descrições mais longas
            allowNull: true // É opcional, como no frontend
        },
        imageUrl: {
            type: DataTypes.STRING(255), // URL da imagem do evento
            allowNull: true // É opcional
        }
    }
)

module.exports = Event