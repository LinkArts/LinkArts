const {Sequelize} = require('sequelize')
//alterar de acordo com aconexão do seu banco de dados
const sequelize = new Sequelize('linkarts','root', 'senhabd123', {
    host: 'localhost',
    dialect: 'mysql'
})

try{

    sequelize.authenticate()

    console.log('Conectado com sucesso!')
}catch(err){

    console.log(err)
}

module.exports = sequelize
