const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Evento = db.define('Eventos', {
    data: {
        type: DataTypes.DATE,
        require: true,
    },
    horaInicial: {
        type: DataTypes.TIME,
        require: true,
    },
    horaFim: {
        type: DataTypes.TIME,
        require: true,
    },
    local: {
        type: DataTypes.STRING,
        require: true,
    },
    img: {
        type: DataTypes.TEXT,
        require: false
    },
    descricao: {
        type: DataTypes.TEXT,
        require: false
    },
    nome: {
        type: DataTypes.TEXT,
        require: true
    },
    owner: {
        type: DataTypes.BIGINT,
        require: true
    }
})

module.exports = Evento