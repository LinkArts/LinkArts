const { Sequelize } = require("sequelize")

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    schema: 'linkarts',
    dialect: 'postgres',
    dialectModule: require('pg'),
    logging: false,
});

try
{
    sequelize.authenticate()
    console.log("Conectado com sucesso ao banco de dados!");
}
catch (err)
{
    console.log(`Problema na conexão com o banco de dados: ${ err }`);
}

module.exports = sequelize

/*
const sequelize = new Sequelize('linkarts', 'root', '', 
{
    host: 'localhost',
    dialect: 'mysql',
})
*/