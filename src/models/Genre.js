const { DataTypes } = require('sequelize')

const db = require('../db/conn')
const Music = require('./Music')

const Genre = db.define('Genre',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            require: true
        },
        genre: {
            type: DataTypes.STRING(20),
            require: true
        }
    })
    
module.exports = Genre