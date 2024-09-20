const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Tag = db.define('Tags', {
    UserId: {
        type: DataTypes.BIGINT,
        require: true,
    },
    codMusicalTalent: {
        type: DataTypes.BIGINT,
        require: true,
    }
})

module.exports = Tag