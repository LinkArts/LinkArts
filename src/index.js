const express = require('express');
const exphbs = require('express-handlebars');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const flash = require('express-flash');
const path = require('path');
const os = require('os');
const { Op } = require('sequelize');
const app = express();
const bodyParser = require('body-parser');
const conn = require('./db/conn');
const User = require('./models/user');
const Message = require('./models/message');
const Token = require('./models/token');
const Local = require('./models/locais')
const thoughtsRoutes = require('./routes/thoughtsRoutes');
const authRoutes = require('./routes/authRoutes');
const ThoughtController = require('./controllers/ThoughtsController');
const { finished } = require('stream');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const AuthController = require('./controllers/AuthController');
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'oenhacker123@gmail.com',
    pass: 'uxvw jhij gdxa ryxz',
  }
});

// Configure Handlebars com runtime options
const hbs = exphbs.create({
    defaultLayout: 'main',
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
    }
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    name: 'session',
    secret: 'nosso_secret',
    resave: false,
    saveUninitialized: false,
    store: new FileStore({
        logFn: function() {},
        path: path.join(os.tmpdir(), 'sessions'),
    }),
    cookie: {
        secure: false,
        maxAge: 360000,
        expires: new Date(Date.now() + 360000),
        httpOnly: true
    }
}));

app.use(flash());
app.use(express.static('public'));

app.use((req, res, next) => {
  if (req.session.userId) {
      res.locals.session = req.session;
  }
  next();
});



app.use(bodyParser.urlencoded({ extended: true }));

app.use('/thoughts', thoughtsRoutes);
app.use('/', authRoutes);
app.get('/', AuthController.login);
app.get('/thoughts/login', async (req,res) => {
  
  res.render('auth/login')
})
app.get('/auth/logout', async (req,res) => {
  
  req.session.destroy()
  res.redirect('/login')
})
app.get('/sendCode/:email', async (req, res) => {

  console.log('Iniciando processo de reset de senha...')
  
  const email = req.params.email;
  const user = await User.findOne({ where: { email: email } });

  if (user) {
    const verificationCode = crypto.randomBytes(3).toString('hex');
    const oldToken = await Token.findOne({ where: { UserId: user.id, status: true } });

    let mailOptions;

    if (oldToken) {
      mailOptions = {
        from: 'oenhacker123@gmail.com',
        to: user.email,
        subject: 'Código de troca de Senha',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h1 style="color: #4CAF50;">Aqui está seu código de verificação!</h1>
            <p>Caro ${user.name},</p>
            <p>Você requisitou uma troca de senha da sua conta no Ipet:</p>
            <h2 style="color: #F6982d;">${oldToken.code}</h2>
            <p>Caso tenha sido um engano, por favor, desconsidere este email.</p>
            <br>
            <p>Atenciosamente,</p>
            <p>Equipe do Ipet</p>
          </div>
        `
      };
    } else {
      mailOptions = {
        from: 'oenhacker123@gmail.com',
        to: user.email,
        subject: 'Código de troca de Senha',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h1 style="color: #4CAF50;">Aqui está seu código de verificação!</h1>
            <p>Caro ${user.name},</p>
            <p>Você requisitou uma troca de senha da sua conta no Ipet:</p>
            <h2 style="color: #F6982d;">${verificationCode}</h2>
            <p>Caso tenha sido um engano, por favor, desconsidere este email.</p>
            <br>
            <p>Atenciosamente,</p>
            <p>Equipe do Ipet</p>
          </div>
        `
      };

      await Token.create({ code: verificationCode, status: true, UserId: user.id});
    }

    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Erro ao enviar o email:', error);
    }
  } else {
    window.alert('Erro inesperado!')
  }
});
  app.get('/messages/:talk', async (req, res) => {
    const user1 = req.params.talk.split(' ')[0]
    const user2 = req.params.talk.split(' ')[1]
    const possibilities = user2 + ' ' + user1
    const firstUser = await User.findOne({where: {id:user1}})
    const secondUser = await User.findOne({where: {id:user2}})
    const user1Profile = await Profile.findOne({where: {userId:firstUser.id}})
    const user2Profile = await Profile.findOne({where: {userId:secondUser.id}})
    
    const messages = await Message.findAll({
      where: {
        talkId: {
          [Op.or]: [ user1 + ' ' + user2, possibilities]
        }
      }
    });
    let update
    messages.forEach(msg => {  
      if(msg){
        let formattedTime = msg.formattedTime
        let formattedDate = msg.formattedDate

        if(msg.name === firstUser.name){
        update += `<article class="msg-container msg-remote" id="msg-0">
          <div class="msg-box">
            <img src="${user1Profile.image}" style="width: 70px; height: 70px; border-radius: 50%"/>
            <div class="flr">
              <div class="messages">
                <p class="msg" id="msg-0">
                  ${msg.content}
                </p>
              </div>
              <span class="timestamp"><span class="username">${msg.name}</span>&bull;<span class="posttime">${formattedTime} ${formattedDate}</span></span>
            </div>
          </div>
        </article>`;}
        else{
          update += `<article class="msg-container msg-remote" id="msg-0">
          <div class="msg-box">
            <img src="${user2Profile.image}" style="width: 70px; height: 70px; border-radius: 50%"/>
            <div class="flr">
              <div class="messages">
                <p class="msg" id="msg-0">
                  ${msg.content}
                </p>
              </div>
              <span class="timestamp"><span class="username">${msg.name}</span>&bull;<span class="posttime">${formattedTime} ${formattedDate}</span></span>
            </div>
          </div>
        </article>`;
        }
      }
  })
  if(update){
  res.send(update.substring(9));
  }
  else{
    res.send(update)
  }
});
app.get('/cities/:sigla', async (req, res) => {

  const sigla = req.params.sigla
  let update = ''
  fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${sigla}/municipios`)
          .then(response => response.json())
          .then(cidades => {
            cidades.sort((a, b) => a.nome.localeCompare(b.nome)); // Ordena por nome
            cidades.forEach(cidade => {
            update += `<option>${cidade.nome}</option> `  
            })
          }).then(finishe => {
            console.log('update =',update)
            res.send(update)
          });

});

app.post('/messages', async (req, res) => {
    await Message.create(req.body)
  });

  app.get('/loadEnderecos/:id',async (req,res) => {
    const id = req.params.id
    let update = ''
    const response = await Local.findAll({where: {UserId:id}})
    response.forEach(end => {

      update += `<option>${end.endereco}</option> `
    })
    res.send(update)
})

conn.sync()
    .then(() => {
        app.listen(3000);
    })
    .catch((err) => {
        console.log(err);
    });
