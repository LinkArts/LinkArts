const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Dir = db.define('Diretorios', {
    nome: {
        type: DataTypes.STRING,
        require: true,
    },
    owner: {
        type: DataTypes.BIGINT,
        require: true,
    }
})

module.exports = Dir