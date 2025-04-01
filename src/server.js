const express = require('express')
const handlebars = require('express-handlebars')
const session = require('express-session')
const FileStore = require('session-file-store')(session)
const flash = require('express-flash')

const app = express();

const authRoutes = require('./routes/authRoutes')
const AuthController = require('./controllers/AuthController')

//models
const Artist = require('./models/Artist')
const Establishment = require('./models/Establishment')

//template engine
app.engine('handlebars', handlebars.engine({ extname: 'handlebars', defaultLayout: "main"}));
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
        secret: 'nosso_secret',
        resave: false,
        saveUninitialized: false,
        store: new FileStore({
            logFn: function() {},
            path: require('path').join(require('os').tmpdir(), 'sessions')
        }),
        cookie: {
            secure: false,
            maxAge: 360000,
            expires: new Date(Date.now() + 360000),
            httpOnly: true
        }
    })
)

// flash messages
app.use(flash())

//public path
app.use(express.static('public'))

//set session to res
app.use((req, res, next) => 
{
    if (req.session.userid)
    {
        res.locals.session = req.session
    }

    next()
})

app.use('/', authRoutes)

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