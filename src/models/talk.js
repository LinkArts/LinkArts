const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Talk = db.define('Talk', {
    user1: {
        type: DataTypes.BIGINT,
        primaryKey: true
    },
    user2: {
        type:DataTypes.BIGINT,
        primaryKey: true
    }
})

module.exports = Talk