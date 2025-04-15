const express = require('express')
const handlebars = require('express-handlebars')
const session = require('express-session')
const FileStore = require('session-file-store')(session)
const flash = require('express-flash')

require('dotenv').config()

const app = express();

const authRoutes = require('./routes/authRoutes')
const AuthController = require('./controllers/AuthController')

const dashboardRoutes = require('./routes/dashboardRoutes')
const DashboardController = require('./controllers/DashboardController')

const profileRoutes = require('./routes/profileRoutes')
const ProfileController = require('./controllers/ProfileController')

//models
const Artist = require('./models/Artist')
const Establishment = require('./models/Establishment')

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

app.get('/', AuthController.login)

const conn = require('./db/conn')

conn
    //.sync({ force: true }) para forçar atualização no banco de dados em caso de alteração nas tabelas (como adicionar associação binária)
    .sync()
    .then(() => 
    {
        app.listen(3000)
    })
    .catch((err) =>
    {
        console.log(err);
    })