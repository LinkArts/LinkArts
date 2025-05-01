const { DataTypes } = require('sequelize')

const db = require('../db/conn')
const Music = require('./Music')

const Genre = db.define('Genre',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            require: true
        },
        genre: {
            type: DataTypes.STRING(20),
            require: true
        }
    })

Genre.belongsTo(Music, {
    foreignKey: 'musicid',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
})
Music.hasOne(Genre, { foreignKey: 'musicid' }) //precisa especificar foreign key em ambos para o sequelize não criar chaves duplicadas

module.exports = Genre