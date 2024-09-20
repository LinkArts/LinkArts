const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const File = db.define('Arquivos', {
    
    caminho: {
        type: DataTypes.STRING,
        require: true,
    },
    categoria: {
        type: DataTypes.STRING,
        require: true,
    },
    descricao: {
        type: DataTypes.STRING,
    },
    diretorio: {
        type: DataTypes.BIGINT,
    }
})

module.exports = File