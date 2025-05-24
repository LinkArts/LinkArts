const { DataTypes } = require('sequelize')

const db = require('../db/conn')
const User = require('./User')

const Establishment = db.define('Establishment',
    {
        cnpj: {
            type: DataTypes.STRING(20),
            primaryKey: true,
        }
    })

module.exports = Establishment