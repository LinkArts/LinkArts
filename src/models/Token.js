const { DataTypes } = require('sequelize')

const db = require('../db/conn')
const User = require('./User')

const Token = db.define('Token', 
{
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    token: {
        type: DataTypes.STRING
    }
})

Token.belongsTo(User, {foreignKey: 'userid'})
User.hasOne(Token)

module.exports = Token