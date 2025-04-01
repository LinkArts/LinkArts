const { DataTypes } = require('sequelize')

const db = require('../db/conn')

const Establishment = db.define('Establishment', 
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
    cnpj: {
        type: DataTypes.STRING,
        require: true
    }
})

module.exports = Establishment