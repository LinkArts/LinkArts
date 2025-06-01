const { DataTypes } = require('sequelize')

const db = require('../db/conn')
const User = require('./User')

const Message = db.define('Message',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        message: {
            type: DataTypes.STRING,
            allowNull: false
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'sending'
        },
    })

module.exports = Message