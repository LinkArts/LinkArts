const { DataTypes } = require('sequelize')

const db = require('../db/conn')
const User = require('./User')

const Artist = db.define('Artist',
    {
        cpf: {
            type: DataTypes.STRING(20),
            primaryKey: true,
            require: true
        }
    })

module.exports = Artist