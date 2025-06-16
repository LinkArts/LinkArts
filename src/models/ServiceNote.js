const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const ServiceNote = db.define('ServiceNote', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    serviceid: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

module.exports = ServiceNote