const { DataTypes } = require('sequelize')

const db = require('../db/conn')
const Music = require('./Music')
const Artist = require('./Artist')

const Album = db.define('Album',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            require: true
        },
        name: {
            type: DataTypes.STRING(20),
            require: true
        }
    })

Album.belongsTo(Artist, {
    foreignKey: 'userid',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
})

Artist.hasMany(Album, {
    foreignKey: 'userid',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
})

module.exports = Album