const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Music = db.define('Music',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
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
            type: DataTypes.STRING(255),
            require: true
        },
    })


module.exports = Music