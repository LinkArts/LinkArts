const { DataTypes } = require('sequelize')
const db = require('../db/conn') // Certifique-se de que o caminho para seu arquivo de conexão está correto

const Service = db.define('Service', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
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
    time: {
        type: DataTypes.TIME,
        allowNull: true
    },
    establishmentName: {
        type: DataTypes.STRING(100),
        allowNull: true
    }
});

module.exports = Service