const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Message = db.define('Message', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        require: true,
    },
    content: {
        type:DataTypes.STRING,
        allowNull: false,
        require: true,
    },
    formattedTime: {
        type:DataTypes.STRING,
        allowNull: false,
        require: true,
    },
    formattedDate: {
        type:DataTypes.STRING,
        allowNull: false,
        require: true,
    },
    talkId: {
        type:DataTypes.STRING,
        allowNull: false,
        require: true,
    },
})


module.exports = Message