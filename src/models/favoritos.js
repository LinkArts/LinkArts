const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Fav = db.define('Favoritos', {
    detentor: {
        type: DataTypes.BIGINT,
        require: true,
    },
    detido: {
        type: DataTypes.BIGINT,
        require: true,
    },
})

module.exports = Fav