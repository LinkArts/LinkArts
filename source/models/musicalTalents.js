const { DataTypes } = require('sequelize');
const db = require('../db/conn');

const MusicalTalent = db.define('musicalTalents', {
    // Definição dos campos da tabela
    descricao: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    categoria: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    subtipo: {
        type: DataTypes.STRING,
    },
    // outros campos...
}, {
    freezeTableName: true,  // Não pluralizar o nome da tabela
    timestamps: false,      // Desativar timestamps, se não precisar
});

module.exports = MusicalTalent;
