const { DataTypes } = require('sequelize')
const db = require('../db/conn')
const Genre = require('./Genre')

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

Music.belongsTo(Genre, {
    foreignKey: 'genreid',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
})

Genre.hasMany(Music, {
    foreignKey: 'genreid',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
})


module.exports = Music