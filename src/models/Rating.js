const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Rating = db.define('Rating', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    rate: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    receiverUserid: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    senderUserid: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    serviceid: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Services',
            key: 'id'
        }
    }
});

module.exports = Rating