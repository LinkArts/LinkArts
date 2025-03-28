const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const User = db.define('User', {
    name: {
        type: DataTypes.STRING,
        require: true,
    },
    email: {
        type: DataTypes.STRING,
        require: true,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        require: true,
    },
    accountType: {
        type: DataTypes.STRING,
        require: true
    },
    CPF_CNPJ: {
        type: DataTypes.STRING,
        require: true,
        unique: true
    },
    state: {
        type: DataTypes.STRING,
        require: true,
    },
    city: {
        type: DataTypes.STRING,
        require: true,
    },
    img: {
        type: DataTypes.STRING,
    },
    description: {
        type: DataTypes.STRING,
        require: false,
    }
})

module.exports = User