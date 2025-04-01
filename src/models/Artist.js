const { DataTypes } = require('sequelize')

const db = require('../db/conn')

const Artist = db.define('Artist', 
{
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        require: true
    },
    email: {
        type: DataTypes.STRING,
        require: true
    },
    password: {
        type: DataTypes.STRING,
        require: true
    },
    cellphone: {
        type: DataTypes.STRING,
        require: true
    },
    cpf: {
        type: DataTypes.STRING,
        require: true
    }
})

module.exports = Artist