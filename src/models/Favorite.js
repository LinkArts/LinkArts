const { DataTypes, INTEGER } = require('sequelize')
const db = require('../db/conn')

const Favorite = db.define('Favorite',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        userid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        }
    }
)

module.exports = Favorite