const { DataTypes } = require('sequelize')

const db = require('../db/conn')

const User = db.define('User',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            require: true
        },
        email: {
            type: DataTypes.STRING(100),
            require: true
        },
        password: {
            type: DataTypes.STRING,
            require: true
        },
        cellphone: {
            type: DataTypes.STRING(20),
            require: true
        },
        state: {
            type: DataTypes.STRING(30),
            defaultValue: null
        },
        city: {
            type: DataTypes.STRING(30),
            defaultValue: null
        },
        description: {
            type: DataTypes.TEXT,
            defaultValue: null,
            allowNull: true,
            validate: {
                len: [0, 500]
            }
        },
        imageUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            defaultValue: null
        },
        instagram: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        facebook: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        linkedin: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        isSuspended: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        isAdmin: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        }
    })

module.exports = User