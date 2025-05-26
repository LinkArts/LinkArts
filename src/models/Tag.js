const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Tag = db.define('Tag',
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
    })

module.exports = Tag