const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Music = db.define('Music',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            require: true
        },
        name: {
            type: DataTypes.STRING(40),
            require: true
        },
        description: {
            type: DataTypes.STRING(80),
            require: true
        },
        image: {
            type: DataTypes.TEXT,
            require: false
        },
    })

module.exports = Music