const { DataTypes } = require('sequelize')

const db = require('../db/conn')
const User = require('./User')
const Chat = require('./Chat')

const Message = db.define('Message',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        message: {
            type: DataTypes.STRING,
            allowNull: false
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'sending'
        },
        chatid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Chats',
                key: 'id'
            }
        },
        userid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        }
    })

Message.belongsTo(User, { foreignKey: 'userid' })
Message.belongsTo(Chat, { foreignKey: 'chatid' })

module.exports = Message