const { DataTypes } = require('sequelize')

const db = require('../db/conn')
const User = require('./User')

const Artist = db.define('Artist',
    {
        cpf: {
            type: DataTypes.STRING(20),
            primaryKey: true,
            require: true
        }
    })

Artist.belongsTo(User, {
    foreignKey: 'userid',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
})
User.hasOne(Artist, { foreignKey: 'userid' }) //precisa especificar foreign key em ambos para o sequelize não criar chaves duplicadas

module.exports = Artist