require("dotenv").config();
const express = require("express");
const handlebars = require("express-handlebars");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const flash = require("express-flash");
const http = require("http");
const { initWebSocket, setupChatHandlers, setupServiceHandlers } = require("./websocket_setup");
const path = require("path");
const os = require("os");

const originalConsoleError = console.error;
console.error = function (...args)
{
  const message = args.join(' ');
  if (message.includes('EPERM') && message.includes('sessions') && message.includes('operation not permitted'))
  {
    return;
  }
  originalConsoleError.apply(console, args);
};

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = initWebSocket(server);

setupChatHandlers();
setupServiceHandlers();

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
const reportRoutes = require('./routes/reportRoutes')
const notificationRoutes = require('./routes/notificationRoutes')

const { User, Artist, Establishment, Music, Genre, Album, Chat, Tag, Event, ServiceRequest, Service, ServiceNote, ServiceProposal, Rating, Report } = require('./models/index')

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
      formatDatePtBr: function (dateString)
      {
        if (!dateString) return "";
        try
        {
          const date = new Date(dateString);
          return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        } catch (e)
        {
          console.error("Erro no helper formatDatePtBr:", e);
          return "";
        }
      },
      formatTime: function (timeString)
      {
        if (!timeString) return "";
        try
        {
          const time = new Date(`1970-01-01T${ timeString }`);
          return time.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch (e)
        {
          console.error("Erro no helper formatTime:", e);
          return "";
        }
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
      },
      and: function (a, b)
      {
        return a && b;
      },
      not: function (value)
      {
        return !value;
      },
      range: function (start, end)
      {
        const result = [];
        for (let i = start; i < end; i++)
        {
          result.push(i);
        }
        return result;
      },
      gt: function (a, b)
      {
        return a > b;
      },
      lte: function (a, b)
      {
        return a <= b;
      },
      formatPrice: function (price)
      {
        if (!price) return "0,00";

        try
        {
          const numericPrice = parseFloat(price);
          if (isNaN(numericPrice)) return "0,00";

          return numericPrice.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        } catch (e)
        {
          console.error("Erro ao formatar preço:", e);
          return "0,00";
        }
      },
      montarLinkSocial: function (tipo, valor)
      {
        if (!valor) return '';
        if (typeof valor !== 'string') return '';
        let v = valor.trim();
        if (v.startsWith('@')) v = v.slice(1);
        if (v.startsWith('http')) return v;
        if (tipo === 'linkedin')
        {
          if (v.includes('linkedin.com'))
          {
            if (!v.startsWith('http')) return 'https://' + v.replace(/^@/, '').replace(/^https?:\/\//, '');
            return v;
          }
          return `https://linkedin.com/in/${ v }`;
        }
        if (tipo === 'instagram')
        {
          if (v.includes('instagram.com'))
          {
            if (!v.startsWith('http')) return 'https://' + v.replace(/^@/, '').replace(/^https?:\/\//, '');
            return v;
          }
          return `https://instagram.com/${ v.replace('@', '') }`;
        }
        if (tipo === 'facebook')
        {
          if (v.includes('facebook.com'))
          {
            if (!v.startsWith('http')) return 'https://' + v.replace(/^@/, '').replace(/^https?:\/\//, '');
            return v;
          }
          return `https://facebook.com/${ v }`;
        }
        return v;
      }
    },
    partialsDir: path.join(__dirname, "views", "partials"),
  })
);
app.set("view engine", "handlebars");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('trust proxy', 1); //para o render

app.use(
  session({
    name: "session",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: new FileStore({
      logFn: function () { },
      path: path.join(os.tmpdir(), "sessions"),
    }),
    cookie: {
      secure: true,
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

  if (req.query.message)
  {
    req.flash('message', req.query.message);
    req.flash('messageType', req.query.type || 'info');
  }

  const message = req.flash("message")[0];
  const type = req.flash("messageType")[0];

  res.locals.message = message;
  res.locals.type = type;

  next();
});

app.use(async (req, res, next) =>
{
  if (req.session.userid)
  {
    try
    {
      const user = await User.findOne({
        where: { id: req.session.userid },
        attributes: ['id', 'name', 'email', 'imageUrl', 'isSuspended'],
        include: [
          { model: Artist, required: false, attributes: ['cpf'] },
          { model: Establishment, required: false, attributes: ['cnpj'] }
        ]
      });

      if (user)
      {
        req.session.isSuspended = user.isSuspended;

        res.locals.currentUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          imageUrl: user.imageUrl,
          isArtist: !!user.Artist,
          isEstablishment: !!user.Establishment,
          isSuspended: user.isSuspended
        };
      }
    }
    catch (err)
    {
      console.error('Erro ao carregar dados do usuário para navbar:', err);
    }
  }

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
app.use('/', reportRoutes)
app.use('/', notificationRoutes)
app.use('/upload', require('./routes/uploadRoutes'))
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