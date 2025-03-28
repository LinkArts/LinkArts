const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Aval = db.define('Avaliacao', {
    conteudo: {
        type: DataTypes.STRING,
    },
    nota: {
        type: DataTypes.DOUBLE,
        require: true,
    },
    servico: {
        type: DataTypes.BIGINT,
        require: true,
    },
    avaliador: {
        type: DataTypes.BIGINT,
        require: true
    },
    avaliado: {
        type: DataTypes.BIGINT,
        require: true,
    }
})

module.exports = Aval