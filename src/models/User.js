const { DataTypes } = require('sequelize')

const db = require('../db/conn')

const User = db.define('User', 
{
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        require: true
    },
    email: {
        type: DataTypes.STRING(100),
        require: true
    },
    password: {
        type: DataTypes.STRING,
        require: true
    },
    cellphone: {
        type: DataTypes.STRING(20),
        require: true
    },
    state: {
        type: DataTypes.STRING(30),
        defaultValue: null
    },
    city: {
        type: DataTypes.STRING(30),
        defaultValue: null
    }
})

module.exports = User