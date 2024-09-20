const express = require('express');
const exphbs = require('express-handlebars');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const flash = require('express-flash');
const path = require('path');
const os = require('os');
const fs = require('fs')
const { Op } = require('sequelize');
const app = express();
const bodyParser = require('body-parser');
const conn = require('./db/conn');
const User = require('./models/user');
const Mensagem= require('./models/mensagem');
const Token = require('./models/token');
const Local = require('./models/locais')
const thoughtsRoutes = require('./routes/thoughtsRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes')
const ThoughtController = require('./controllers/ThoughtsController');
const { finished } = require('stream');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const AuthController = require('./controllers/AuthController');
const Dir = require('./models/diretorios')
const File = require('./models/arquivos')
const Proposta = require('./models/proposta');
const multer = require('multer');
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app); // Criando o servidor HTTP
const io = socketIo(server); // Passando o servidor para o Socket.io

// Configurando o armazenamento com multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');  // Pasta onde os arquivos serão armazenados
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));  // Nome do arquivo
    }
});

const upload = multer({ storage: storage });
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
app.use('/chat', chatRoutes);
app.get('/', AuthController.login);
app.get('/thoughts/login', async (req,res) => {
  
  res.render('auth/login')
})
app.get('/auth/logout', async (req,res) => {
  
  req.session.destroy()
  res.redirect('/login')
})
app.get('/clear', (req, res) => {
  req.flash('message', ''); // Limpa a mensagem
  req.session.save(() => {
      res.json({ success: true });
  });
});
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
  
io.on('connection', (socket) => {
  console.log('Usuário conectado');

  socket.on('enviar_mensagem', async (data) => {

      const { conteudo, remetenteId, destinatarioId } = data;
      
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0'); // Horas no formato 00-23
      const minutes = now.getMinutes().toString().padStart(2, '0'); // Minutos no formato 00-59
      const seconds = now.getSeconds().toString().padStart(2, '0'); // Segundos no formato 00-59

      const currentTime = `${hours}:${minutes}:${seconds}`;
      // Salva a mensagem no banco de dados
      const dia = String(now.getDate()).padStart(2, '0');
      const mes = String(now.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
      const ano = now.getFullYear();
      let dataFormatada = `${dia}/${mes}/${ano}`;
      const mensagem = await Mensagem.create({ conteudo, remetente: remetenteId, destinatario: destinatarioId, hora: currentTime, data: dataFormatada, visto: false });
      // Notifica o destinatário que ele recebeu uma nova mensagem
      io.to(destinatarioId).emit('nova_mensagem', mensagem);
  });

  // Desconectar o usuário
  socket.on('disconnect', () => {
      console.log('Usuário desconectado');
  });
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

app.get('/loadServicos/:avaliador/:avaliado',async (req,res) => {
  const avaliador = req.params.avaliador
  const avaliado = req.params.avaliado
  let update = ''
  const servicos = await Proposta.findAll({ where: { [Op.or]: [
    { senderId: avaliador, receiverId: avaliado },
    { senderId: avaliado, receiverId: avaliador }
], status: 'concluida' } })
  servicos.forEach(item => {

    const dia = String(item.data.getDate() + 1).padStart(2, '0');
            const mes = String(item.data.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
            const ano = item.data.getFullYear();
            item.dataFormatada = `${dia}/${mes}/${ano}`;
    update += `<option>${item.senderId};${item.receiverId};${item.horaInicial};${item.local};${item.dataFormatada}<span style="text-color: #fff;">;${item.data}</span></option> `
  })
  res.send(update)
})

app.get('/loadFiles/:id',async (req,res) => {
  
  const owner = req.params.id;
  let pastas = [];
  
  const diretorios = await Dir.findAll({ where: { owner: owner } });
  
  for (const item of diretorios) {
    const obj = {
      name: item.nome,
      files: [],
      videos: [],
      links: [],
    };
  
    const files = await File.findAll({ where: { diretorio: item.id, categoria: 'file' } });
    files.forEach(file => {
      obj.files.push(file.caminho);
    });
  
    const videos = await File.findAll({ where: { diretorio: item.id, categoria: 'video' } });
    videos.forEach(video => {
      obj.videos.push(video.caminho);
    });
  
    const links = await File.findAll({ where: { diretorio: item.id, categoria: 'link' } });
    links.forEach(link => {
      obj.links.push({ url: link.caminho, name: link.descricao });
    });
  
    pastas.push(obj);
  }
  
  //console.log(owner, pastas, 'teste!!!!!!!');
  res.send(pastas);
  
})

app.post('/thoughts/addVideo/:id/:dir/:url', async (req, res) => {
  const owner = req.params.id;
  const dir = req.params.dir;
  const url = (req.params.url);  // Decodifica a URL que foi codificada no frontend
  const dirCode = await Dir.findOne({where: {owner:owner,nome:dir}})
  const fileExists = await File.findOne({ where: {caminho: url,diretorio: dirCode.id}})
  if(!fileExists){
    try {
      const file = {
          caminho: url,
          categoria: 'video',
          diretorio: dirCode.id,
      };

      await File.create(file);  // Supondo que File.create insira no banco de dados

      res.json({ success: true });  // Retorna uma resposta de sucesso
  } catch (error) {
      console.error('Erro ao adicionar vídeo:', error);
      res.status(500).json({ success: false, message: 'Erro ao adicionar vídeo' });  // Responde com erro
  }
  }
  else{
    console.log('hey')
    res.status(500).json({ success: false, message: 'Vídeo já adicionado' });  // Responde com erro
  }
  
});

app.post('/thoughts/addLink/:id/:dir/:url/:name', async (req, res) => {
  
  const owner = req.params.id;
  const dir = req.params.dir;
  const url = decodeURIComponent(req.params.url);  // Decodifica a URL
  const name = decodeURIComponent(req.params.name);
  const dirCode = await Dir.findOne({where: {owner:owner,nome:dir}})
  const fileExists = await File.findOne({ where: {caminho: url,diretorio: dirCode.id}})
  if(!fileExists){
    try {
      const file = {
          caminho: url,
          categoria: 'link',
          diretorio: dirCode.id,
          descricao: name
      };

      await File.create(file);  // Supondo que File.create insira no banco de dados

      res.json({ success: true });  // Retorna uma resposta de sucesso
  } catch (error) {
      console.error('Erro ao adicionar vídeo:', error);
      res.status(500).json({ success: false, message: 'Erro ao adicionar vídeo' });  // Responde com erro
  }
  }
  else{
    console.log('hey')
    res.status(500).json({ success: false, message: 'Link já adicionado' });  // Responde com erro
  }
  
});

// Rota para lidar com o upload de arquivos
app.post('/thoughts/uploadFile/:id', upload.single('file'), async (req, res) => {
  const owner = req.params.id;
  const directory = req.body.directory;
  let fileUrl = null;

  if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;  // URL do arquivo enviado
      const dirCode = await Dir.findOne({where: {owner:owner,nome:directory}})
      try {
          // Aqui você pode salvar a referência do arquivo no banco de dados
          const file = {
              caminho: fileUrl,
              categoria: 'file',  // Define a categoria como "file"
              diretorio: dirCode.id
          };

          console.log(file)
          await File.create(file);  // Salva no banco de dados

          res.json({ success: true, message: 'Arquivo enviado com sucesso!' });
      } catch (error) {
          console.error('Erro ao salvar o arquivo:', error);
          res.status(500).json({ success: false, message: 'Erro ao salvar o arquivo.' });
      }
  } else {
      res.status(400).json({ success: false, message: 'Nenhum arquivo foi enviado.' });
  }
});

app.delete('/thoughts/deleteFile/:id/:dir/:caminho/:categoria', async (req, res) => {
   const owner = req.params.id;
  const dir = req.params.dir;
  const cat = req.params.categoria;
  let caminho
  if(cat == 'file'){
    caminho = '/uploads/'+req.params.caminho;
  }
  else{
    caminho = req.params.caminho
  }
  const dirCode = await Dir.findOne({where: {owner:owner,nome:dir}})
  try {
    // Encontre o arquivo no banco de dados
    const file = await File.findOne({ where: { caminho: caminho, diretorio: dirCode.id, categoria: cat } });
    console.log(file,caminho,dirCode.id,cat)
    if (!file) {
      return res.status(404).json({ success: false, message: 'Arquivo não encontrado.' });
    }

    if(cat == 'file'){
    // Caminho absoluto do arquivo na pasta uploads
    const filePath = path.join(__dirname, 'public', 'uploads', path.basename(file.caminho));

    // Verifique se o arquivo realmente existe
    if (fs.existsSync(filePath)) {
      // Deletar o arquivo do sistema de arquivos
      fs.unlinkSync(filePath);
    }
  }
    // Remover a entrada do banco de dados
    await file.destroy();

    res.json({ success: true, message: 'Arquivo deletado com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar o arquivo:', error);
    res.status(500).json({ success: false, message: 'Erro ao deletar o arquivo.' });
  }
});

app.delete('/thoughts/deleteDir/:id/:dir', async (req, res) => {

    const owner = req.params.id;
    const dir = req.params.dir;
    
    try{

    const target = await Dir.findOne({where: {owner:owner,nome:dir}})

    const files = await File.findAll({where: {diretorio: target.id}})


    files.forEach(async file => {

      await file.destroy();

    })
    
    await target.destroy();

      res.json({ success: true, message: 'Diretor deletado com sucesso!' });
    } 
    catch (error) {
      console.error('Erro ao deletar o diretório:', error);
      res.status(500).json({ success: false, message: 'Erro ao deletar o diretorio.' });
    }
});

// Rota para marcar mensagens como vistas
app.post('/chat/marcarComoVisto', async (req, res) => {
  const { remetenteId, destinatarioId } = req.body;

  await Mensagem.update({ visto: true }, {
      where: {
          remetenteId,
          destinatarioId,
          visto: false  // Só atualizar mensagens não vistas
      }
  });

  res.json({ success: true });
});
const onlineUsers = {};

io.on('connection',(socket) => {
    const userId = socket.handshake.query.userId; // Captura o ID do usuário
    onlineUsers[userId] = socket.id;
    // Notifica outros usuários que ele está online
    socket.broadcast.emit('user_online', userId);

    socket.on('disconnect',() => {
        delete onlineUsers[userId];
        // Notifica outros usuários que ele ficou offline
        socket.broadcast.emit('user_offline', userId);
    });
});
io.on('connection', (socket) => {
  socket.on('digitando', (data) => {
      io.to(data.destinatarioId).emit('usuario_digitando', data.remetenteId);
  });

  socket.on('parou_de_digitar', (data) => {
      io.to(data.destinatarioId).emit('usuario_parou_de_digitar', data.remetenteId);
  });
});


conn.sync()
    .then(() => {
        server.listen(3000);
    })
    .catch((err) => {
        console.log(err);
    });
