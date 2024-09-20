const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Notific = db.define('Notificacoes', {
    conteudo: {
        type: DataTypes.STRING,
        require: true,
    },
    categoria: {
        type: DataTypes.STRING,
        require: true,
    },
    remetente: {
        type: DataTypes.BIGINT,
        require: true,
    },
    destinatario: {
        type: DataTypes.BIGINT,
        require: true,
    },
    status: {
        type: DataTypes.BOOLEAN,
        require: true
    }
})

module.exports = Notific