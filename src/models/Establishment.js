const { DataTypes } = require('sequelize')

const db = require('../db/conn')
const User = require('./User')

const Establishment = db.define('Establishment',
    {
        cnpj: {
            type: DataTypes.STRING(20),
            primaryKey: true,
            require: true
        }
    })

Establishment.belongsTo(User, {
    foreignKey: 'userid',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
})
User.hasOne(Establishment, { foreignKey: 'userid' }) //precisa especificar foreign key em ambos para o sequelize não criar chaves duplicadas

module.exports = Establishment