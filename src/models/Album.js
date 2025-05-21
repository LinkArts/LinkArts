const { DataTypes } = require('sequelize')

const db = require('../db/conn')
const Music = require('./Music')

const Album = db.define('Album',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            require: true
        },
        name: {
            type: DataTypes.STRING(20),
            require: true
        }
    })

module.exports = Album