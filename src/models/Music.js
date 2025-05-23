const { DataTypes } = require('sequelize')
const db = require('../db/conn')
const Genre = require('./Genre')
const Artist = require('./Artist')
const Album = require('./Album')

const Music = db.define('Music',
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

Music.belongsTo(Artist, {
    foreignKey: 'userid',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
})

Artist.hasMany(Music, {
    foreignKey: 'userid',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
})

Music.belongsToMany(Album, {
    foreignKey: 'musicid',
    otherKey: 'albumid',
    through: 'AlbumMusic',
    onDelete: 'CASCADE',
})

Album.belongsToMany(Music, {
    foreignKey: 'albumid',
    otherKey: 'musicid',
    through: 'AlbumMusic',
    onDelete: 'CASCADE',
})

module.exports = Music