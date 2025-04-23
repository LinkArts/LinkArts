const { DataTypes } = require('sequelize')

const db = require('../db/conn')

const PendingUser = db.define('PendingUser', 
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
    type: {
        type: DataTypes.STRING(20),
        require: true
    },
    document: {
        type: DataTypes.STRING(20),
        require: true
    }
})

module.exports = PendingUser