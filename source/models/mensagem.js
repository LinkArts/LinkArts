const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Mensagem = db.define('Mensagens', {

    conteudo: {
        type:DataTypes.STRING,
        allowNull: false,
        require: true,
    },
    hora: {
        type:DataTypes.STRING,
        allowNull: false,
        require: true,
    },
    data: {
        type:DataTypes.STRING,
        allowNull: false,
        require: true,
    },
    remetente: {
        type: DataTypes.BIGINT,
        allowNull: false,
        require: true
    },
    destinatario: {
        type: DataTypes.BIGINT,
        allowNull: false,
        require: true
    },
    visto: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        require: true
    }

})


module.exports = Mensagem