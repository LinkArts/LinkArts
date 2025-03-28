const { DataTypes } = require('sequelize')
const db = require('../db/conn')
const User = require('./user')

const Local = db.define('Locais', {
    endereco: {
        type: DataTypes.STRING,
        require: false,
    },
    horaInicio: {
        type: DataTypes.TIME,

    },
    horaFim: {
        type: DataTypes.TIME,
        
    },
    UserId: {
        type: DataTypes.BIGINT,
        require: true
    },
})

module.exports = Local