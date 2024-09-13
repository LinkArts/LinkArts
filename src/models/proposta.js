const { DataTypes } = require('sequelize')
const db = require('../db/conn')
const User = require('./user')

const Proposta = db.define('Proposta', {
    data: {
        type: DataTypes.DATE,
        require: true,
    },
    hora: {
        type: DataTypes.TIME,
        require: true,
    },
    local: {
        type: DataTypes.STRING,
        require: false,
    },
    valorHora: {
        type: DataTypes.FLOAT,
        require: true,
    },
    mensagem: {
        type: DataTypes.STRING,
        require: false,
    },
    senderId: {
        type: DataTypes.BIGINT,
        require: true
    },
    receiverId: {
        type: DataTypes.BIGINT,
        require: true
    },
    status: {
        type: DataTypes.TEXT,
        require: false
    },
})

module.exports = Proposta