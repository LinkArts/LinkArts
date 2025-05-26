require('dotenv').config()
const express = require('express')
const handlebars = require('express-handlebars')
const session = require('express-session')
const FileStore = require('session-file-store')(session)
const flash = require('express-flash')

const app = express();

const authRoutes = require('./routes/authRoutes')
const AuthController = require('./controllers/AuthController')

const dashboardRoutes = require('./routes/dashboardRoutes')
const DashboardController = require('./controllers/DashboardController')

const chatRoutes = require('./routes/chatRoutes')
const chatController = require('./controllers/ChatController')

const profileRoutes = require('./routes/profileRoutes')
const ProfileController = require('./controllers/ProfileController')

const searchRoutes = require('./routes/searchRoutes')
const SearchController = require('./controllers/SearchController')

//models
const { User, Artist, Establishment, Music, Genre, Album, Chat, Tag } = require('./models/index')

//template engine
app.engine('handlebars', handlebars.engine(
    {
        extname: 'handlebars',
        defaultLayout: "main",
        helpers:
        {
            log: (something) => console.log(something),
            eq: (a, b) => a === b
        },
        partialsDir: require('path').join(__dirname, 'views', 'partials'),
    }
));
app.set('view engine', 'handlebars')

//receber resposta do body
app.use(express.urlencoded(
    {
        extended: true
    }
))

app.use(express.json())

//session middleware
app.use(
    session({
        name: 'session',
        secret: 'nosso_secret', //trocar futuramente para garantir segurança
        resave: false,
        saveUninitialized: false,
        rolling: true,
        store: new FileStore({
            logFn: function () { },
            path: require('path').join(require('os').tmpdir(), 'sessions')
        }),
        cookie: {
            secure: false,
            maxAge: 60 * 60 * 1000,
            httpOnly: true,
        }
    })
)

// flash messages
app.use(flash())

//public path
app.use(express.static('public'))

//middleware global que aplica em todas as rotas
app.use((req, res, next) => 
{
    if (req.session.userid)
    {
        res.locals.session = req.session
        res.locals.username = req.username
    }

    const message = req.flash('message')[0]
    const type = req.flash('messageType')[0]

    res.locals.message = message
    res.locals.type = type

    next()
})

app.use('/', authRoutes)
app.use('/', dashboardRoutes)
app.use('/profile', profileRoutes)
app.use('/', searchRoutes)
app.use('/', chatRoutes)
app.get('/', AuthController.renderLogin)

app.use((req, res) =>
{
    res.render('layouts/404')
})


const conn = require('./db/conn')

conn
    //.sync({ force: true }) //para forçar atualização no banco de dados em caso de alteração nas tabelas (como adicionar associação binária)
    .sync()
    .then(() => 
    {
        app.listen(3000)
    })
    .catch((err) =>
    {
        console.log(err);
    })

// seedGenres.js

/*const { Genre } = require('./models'); // ajuste o caminho para o seu model
const sequelize = require('./config/database'); // ajuste para sua instância do sequelize

async function seedGenres() {
  const genres = [
    'Pop', 'Rock', 'Jazz', 'Blues', 'Hip Hop', 'Rap', 'R&B', 'Funk',
    'Soul', 'Samba', 'MPB', 'Pagode', 'Forró', 'Axé', 'Brega', 'Sertanejo',
    'Sertanejo Universitário', 'Eletrônica', 'Techno', 'House', 'Trance',
    'Dubstep', 'Lo-fi', 'Reggae', 'Dancehall', 'K-pop', 'J-pop', 'Cumbia',
    'Tango', 'Fado', 'Country', 'Gospel', 'Cristã Contemporânea', 'Coral',
    'Clássica', 'Opera', 'Instrumental', 'Indie', 'Alternativo', 'Punk',
    'Hardcore', 'Metal', 'Heavy Metal', 'Black Metal', 'Trap', 'Drill',
    'Grime', 'Folk', 'Ambient', 'Experimental', 'Chillout', 'New Age',
    'Bossa Nova', 'Choro', 'Frevo', 'Maracatu', 'Carimbó', 'Tecnobrega',
    'Piseiro', 'Arrocha', 'Reggaeton', 'Zouk', 'Ska', 'World Music'
  ];

  const data = genres.map(name => ({ name }));

  try {
    await sequelize.sync(); // opcional: apenas se quiser sincronizar o schema antes
    await Genre.bulkCreate(data, {
      ignoreDuplicates: true, // Ignora se já existir (requer campo único no banco)
    });
    console.log('Gêneros inseridos com sucesso!');
  } catch (error) {
    console.error('Erro ao inserir gêneros:', error);
  } finally {
    await sequelize.close();
  }
}

seedGenres();*/