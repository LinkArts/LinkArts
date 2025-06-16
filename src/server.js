require("dotenv").config();
const express = require("express");
const handlebars = require("express-handlebars");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const flash = require("express-flash");
const http = require("http");
const { initWebSocket, setupChatHandlers } = require("./websocket_setup");
const path = require("path");
const os = require("os");

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = initWebSocket(server);

setupChatHandlers();

const authRoutes = require("./routes/authRoutes");
const AuthController = require("./controllers/AuthController");
const dashboardRoutes = require("./routes/dashboardRoutes");
const DashboardController = require("./controllers/DashboardController");
const chatRoutes = require("./routes/chatRoutes");
const chatController = require("./controllers/ChatController");
const profileRoutes = require("./routes/profileRoutes");
const ProfileController = require("./controllers/ProfileController");
const searchRoutes = require("./routes/searchRoutes");
const SearchController = require("./controllers/SearchController");
const agendaRoutes = require("./routes/agendaRoutes");
const AgendaController = require("./controllers/AgendaController");
const serviceRoutes = require('./routes/serviceRoutes')
const adminRoutes = require('./routes/adminRoutes')

const { User, Artist, Establishment, Music, Genre, Album, Chat, Tag, Event, ServiceRequest, Service, ServiceNote, ServiceProposal } = require('./models/index')

app.engine(
  "handlebars",
  handlebars.engine({
    extname: "handlebars",
    defaultLayout: "main",
    helpers: {
      log: (something) => console.log(something),
      eq: (a, b) => a === b,
      json: function (context)
      {
        return JSON.stringify(context);
      },
      formatDate: function (timestamp)
      {
        if (!timestamp) return "";
        try
        {
          const date = new Date(timestamp);
          const now = new Date();
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          if (date.toDateString() === now.toDateString())
          {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          } else if (date.toDateString() === yesterday.toDateString())
          {
            return "Ontem";
          } else
          {
            return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
          }
        } catch (e)
        {
          console.error("Erro no helper formatDate (backend):", e);
          return "";
        }
      },
      randomColor: function ()
      {
        const colors = ["FFA500", "008000", "FFC0CB", "0000FF", "800080", "FF0000", "4B0082"];
        return colors[Math.floor(Math.random() * colors.length)];
      },
      substring: function (str, start, length)
      {
        if (!str || typeof str !== 'string') return "";
        try
        {
          if (typeof start !== 'number' || start < 0) start = 0;
          if (typeof length !== 'number' || length < 0) return str.substring(start);
          return str.substring(start, start + length);
        } catch (e)
        {
          console.error("Erro no helper substring:", e);
          return "";
        }
      },
      startsWith: function (str, prefix)
      {
        if (!str || typeof str !== 'string') return false;
        if (!prefix || typeof prefix !== 'string') return false;
        return str.startsWith(prefix);
      },
      or: function ()
      {
        for (let i = 0; i < arguments.length - 1; i++)
        {
          if (arguments[i]) return true;
        }
        return false;
      }
    },
    partialsDir: path.join(__dirname, "views", "partials"),
  })
);
app.set("view engine", "handlebars");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    name: "session",
    secret: "nosso_secret", // Trocar para variável de ambiente em produção
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: new FileStore({
      logFn: function () { },
      path: path.join(os.tmpdir(), "sessions"),
    }),
    cookie: {
      secure: false, // Definir como true em produção com HTTPS
      maxAge: 60 * 60 * 1000, // 1 hora
      httpOnly: true,
    },
  })
);

app.use(flash());

app.use(express.static("public"));

app.use((req, res, next) =>
{
  if (req.session.userid)
  {
    res.locals.session = req.session;
  }

  const message = req.flash("message")[0];
  const type = req.flash("messageType")[0];

  res.locals.message = message;
  res.locals.type = type;

  next();
});

app.use('/', authRoutes)
app.use('/', dashboardRoutes)
app.use('/profile', profileRoutes)
app.use('/', searchRoutes)
app.use('/', chatRoutes)
app.use('/', agendaRoutes)
app.use('/', serviceRoutes)
app.use('/', adminRoutes)
app.get('/', AuthController.renderLogin)

app.use((req, res) =>
{
  res.status(404).render("layouts/404");
});

const conn = require("./db/conn");

conn
  //.sync({ force: true })
  .sync()
  .then(() =>
  {
    server.listen(PORT, () =>
    {
      console.log(`Servidor rodando na porta ${ PORT }`);
    });
  })
  .catch((err) =>
  {
    console.error("Erro ao sincronizar com o banco de dados:", err);
  });