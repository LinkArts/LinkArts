const { DataTypes } = require('sequelize')

const db = require('../db/conn')
const User = require('./User')

const Chat = db.define('Chat',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        }
    })

module.exports = Chat