const { DataTypes } = require('sequelize')

const db = require('../db/conn')
const Music = require('./Music')
const Artist = require('./Artist')

const Album = db.define('Album',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING(50),
            require: true
        },
        userid: {
            type: DataTypes.STRING,
            allowNull: false,
            references: {
                model: 'Artists',
                key: 'cpf'
            }
        },
        imageUrl: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    })

module.exports = Album