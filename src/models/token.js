const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Token = db.define('Token', {
    code: {
        type: DataTypes.STRING,
        require: true,
        allowNull: false,
    },
    status: {
        type: DataTypes.BOOLEAN,
        require: true,
        allowNull: false,
    },
})

const User = require('./user')

Token.belongsTo(User)
User.hasMany(Token)

module.exports = Token