
const User = require('../models/user')
const musicalTalent = require('../models/musicalTalents')
const session = require('express-session')
const axios = require('axios')
const { use } = require('../routes/thoughtsRoutes')
const { Op, where } = require('sequelize');
const Proposta = require('../models/proposta')
const moment = require('moment');
const Local = require('../models/locais')
const Fav = require('../models/favoritos')
const Aval = require('../models/avaliacao')
const Evento = require('../models/eventos')
const Tag = require('../models/Tag')
const File = require('../models/diretorios')

module.exports = class ProfiletController{

    static async load404(req,res){
        res.render('thoughts/404', {session: req.session})
       
    }

     static async viewProfile(req,res){

        const id = req.params.id
        req.session.userId = id
        if(req.session.userId){
        let selfView = true
        const id = req.session.userId
        const locais = await Local.findAll({where:{UserId:id}})
        const eventos = await Evento.findAll({where: {owner: id}})
        const user = await User.findOne({where: {id:id}})
        const tags = await Tag.findAll({where: {UserId: id}})
        let hasTags = true
        if(!tags){
            hasTags = false
        }
        const avaliacoes = await Aval.findAll({where: {avaliado: id}})
        tags.forEach(async tag => {

            tag.talent = await musicalTalent.findOne({where: {id:tag.codMusicalTalent}})
            if(tag.talent.categoria == 'Instrumento'){
                tag.instrumento = true
            }
            else{
                tag.talent.instrumento = false
            }

            if(tag.talent.categoria == 'Gênero Musical'){
                tag.genero = true
            }
            else{
                tag.genero = false
            }
        })
        let media = 0
        if(avaliacoes.length > 0){
            
            avaliacoes.forEach(aval => {

                media += aval.nota
            })
            media = media / avaliacoes.length
        }
        let porcentagem = media / 5 * 100
        let type
        if(user.accountType === 'Empresa'){
            type = 1
        }
        else{
            type = 0
        }
        res.render('thoughts/profile', {session: req.session,user,selfView,type,id,locais, media,porcentagem,eventos,tags,hasTags})
        }
        else{
            res.redirect('404')
        }  
    }

    static async viewAvaliacoes(req,res){

        req.session.userId = req.params.id
        if(req.session.userId){
        const id = req.params.id
        const requesterId = req.params.requester
        const avaliacoes = await Aval.findAll({where: {avaliado: id}})
        avaliacoes.forEach(async aval => {
            aval.perfil = await User.findOne({where: {id: aval.avaliador}})
            const data = new Date(aval.createdAt)
            const dia = String(data.getDate() ).padStart(2, '0');
            const mes = String(data.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
            const ano = data.getFullYear();
            aval.data = `${dia}/${mes}/${ano}`;
            aval.requesterId = requesterId
        })
        avaliacoes.sort((a, b) => {
            
            const createdAtA = new Date(a.createdAt);
            const createdAtB = new Date(b.createdAt);
        
            if (createdAtA < createdAtB) {
                return 1; // 'a' vem antes de 'b'
            } 
            if (createdAtA > createdAtB) {
                return -1;  // 'b' vem antes de 'a'
            }
        
            // Se as datas de criação forem iguais, ordena pela data de atualização
            const updatedAtA = new Date(a.updatedAt);
            const updatedAtB = new Date(b.updatedAt);
        
            if (updatedAtA < updatedAtB) {
                return 1; // 'a' vem antes de 'b'
            } 
            if (updatedAtA > updatedAtB) {
                return -1;  // 'b' vem antes de 'a'
            }
        
            // Mantém a ordem se todas as comparações resultarem em empate
            return 0;
        });

        res.render('thoughts/avaliacoes', {session: req.session,id,requesterId,avaliacoes})
        }
        else{
            res.redirect('404')
        }  
    }

    static async cadastrarEndereco(req,res){

        if(req.session.userId){
        const cep = req.body.cep
        const horaInicial = req.body.hora_abertura
        const horaFim = req.body.hora_fechamento
        const local = {}
        const apiKey = '18c0f5090b1447a3127a4ec3d2c6d486';
        try {
            const response = await fetch(`https://www.cepaberto.com/api/v3/cep?cep=${cep}`,{headers: {Authorization: `Token token=${apiKey}`}});  // ou outra função que retorna uma promessa
            const data = await response.json();
            const endereco = data.logradouro + ', ' + data.bairro + ', ' + data.cidade.nome;
        
            local.endereco = endereco;
            local.horaInicial = horaInicial;
            local.horaFim = horaFim;
            local.UserId = req.session.userId   
            
            await Local.create(local);  // Aguarda o Local ser criado no banco de dados
            req.flash('message', '');
            req.flash('message', 'Endereço cadastrado com sucesso');
            req.session.save(() => {
                res.redirect(`/thoughts/profile/${req.session.userId}/${req.session.userId}`);
            });
        } catch (error) {
            req.flash('message', 'Erro ao buscar endereço');
            req.session.save(() => {
                res.redirect(`/thoughts/profile/${req.session.userId}/${req.session.userId}`);
            });
        }
    }
    else{
        res.redirect('404')
    }
        
    }

    static async favoritar(req,res){

        req.session.userId = req.params.detentor
        if(req.session.userId){
        
            const detentor = req.params.detentor
            const detido = req.params.detido
            const fav = await Fav.findOne({where: {detentor:detentor,detido:detido}})
            if(fav){
                req.flash('message','')
            req.flash('message','Perfil já adicionado aos favoritos')
            req.session.save(() => {
                res.redirect(`/thoughts/profile/${detido}/${detentor}`);
            });
            }
            else{
                const favorito = {
                    detentor: detentor,
                    detido: detido,
                }
                await Fav.create(favorito)
                req.flash('message','')
                req.flash('message','Perfil adicionado aos favoritos')
                req.session.save(() => {
                    res.redirect(`/thoughts/profile/${detido}/${detentor}`);
                });
            }
    }
    else{
        res.redirect('404')
    }
        
    }

    static async exibirFavoritos(req,res){

        req.session.userId = req.params.detentor
        if(req.session.userId){
        
            const detentor = req.params.detentor
            const favoritos = await Fav.findAll({where: {detentor:detentor}})
            favoritos.forEach(async fav => {

                fav.user = await User.findOne({ where: {id: fav.detido}})
            })
            res.render(`thoughts/favoritos`, {session: req.session, favoritos,detentor});
    }
    else{
        res.redirect('404')
    }
        
    }

    static async avaliar(req,res){

        req.session.userId = req.params.avaliador
        if(req.session.userId){
        
            const avaliador = req.params.avaliador
            const avaliado = req.params.avaliado
            let valid = true
            let msg
            if (req.body.servico === 'Selecione uma opção') {
                
                valid = false
                msg = 'Selecione um serviço válido'
            }
            else{
                const conteudo = req.body.conteudo
                const nota = req.body.nota
                const detalhesServico = req.body.servico.split(';')
                const servico = await Proposta.findOne({where: {senderId: detalhesServico[0], receiverId: detalhesServico[1], horaInicial: detalhesServico[2], data: detalhesServico[5]}})
                const avaliacao = {
                    conteudo: conteudo,
                    nota: nota,
                    servico: servico.id,
                    avaliador: avaliador,
                    avaliado: avaliado
                }
                const avalExists = await Aval.findOne({where: {servico: servico.id,avaliador: avaliador}})
                if(avalExists){

                    valid = false
                    msg = "Já existe uma avaliação registrada para este servço"
                }
                if(valid){
                await Aval.create(avaliacao)
                    req.flash('message','')
                    req.flash('message','Avaliação Enviada com sucesso!')
                    req.session.save(() => {
                        res.redirect(`/thoughts/profile/${avaliado}/${avaliador}`);
                    });
                }
                else{

                    req.flash('message','')
                    req.flash('message',msg)
                    req.session.save(() => {
                    res.redirect(`/thoughts/profile/${avaliado}/${avaliador}`);
                });
                }
    
            }            
        }
    else{
        res.redirect('404')
    }
        
    }

    static async cadastrarEvento(req, res) {

        req.session.userId = req.params.id
        const id = req.params.id;

        const eventoExists = false

        if(eventoExists || !req.file){
            
            req.flash('message', 'Evento já cadastrado!');
            req.session.save(() => {
                res.redirect(`/thoughts/profile/${id}/${id}`);
            });
        }
        else{
            
            const evento = {
                data: req.body.data,
                horaInicial: req.body.horaInicial + ':00',
                horaFim: req.body.horaFim + ':00',
                local: req.body.endereco,
                img: req.file.filename,
                nome: req.body.nome,
                descricao: req.body.descricao,
                owner: id
            };  
        
            await Evento.create(evento)
            req.flash('message','')
            req.flash('message', 'Evento cadastrado com sucesso!');
            req.session.save(() => {
                res.redirect(`/thoughts/profile/${id}/${id}`);
            });
        }
    }

    static async cadastrarTag(req, res) {

        req.session.userId = req.params.id
        const instrumentosCorda = await musicalTalent.findAll({where: {categoria:'Instrumento',subtipo:'Corda'}})
        const instrumentosSopro = await musicalTalent.findAll({where: {categoria:'Instrumento',subtipo:'Sopro'}})
        const instrumentosPercussao = await musicalTalent.findAll({where: {categoria:'Instrumento',subtipo:'Percussão'}})
        const generos = await musicalTalent.findAll({where: {categoria:'Gênero Musical'}})
        const profissoes = await musicalTalent.findAll({where: {categoria:'Profissão'}})
        res.render('thoughts/tags',{sesssion: req.session, instrumentosCorda, instrumentosSopro, instrumentosPercussao, generos, profissoes})
    }

    static async cadastrarTagPost(req, res) {

        req.session.userId = req.params.id
        const selectedTalents = req.body.musicalTalents;
        
        await Tag.destroy({where: {UserId: req.session.userId}})
        
        selectedTalents.forEach(async talent => {

            const talentSpec = await musicalTalent.findOne({where: {descricao: talent}})
            const tagExists = await Tag.findOne({where: {UserId: req.session.userId,codMusicalTalent: talentSpec.id}})
            if(!tagExists){
                const tag = {UserId: req.session.userId, codMusicalTalent: talentSpec.id}
                await Tag.create(tag);
            }

        })
        req.flash('message','')
        req.flash('message', 'Talento cadastrado com sucesso!');
            req.session.save(() => {
                res.redirect(`/thoughts/profile/${req.session.userId}/${req.session.userId}`);
            });
    }

    static async criarPasta(req, res) {

        req.session.userId = req.params.id
        const dir = {
            nome: req.body.nome,
            owner: req.session.userId,
        }
        
        const dirExists = await File.findOne({where: {nome: dir.nome,owner: dir.owner}})
        
        if(dirExists){

            req.flash('message','')
            req.flash('message', 'Esta pasta já existe!');
                req.session.save(() => {
                    res.redirect(`/thoughts/profile/${req.session.userId}/${req.session.userId}`);
                });
        }
        else{

            await File.create(dir);

            req.flash('message','')
            req.flash('message', 'Pasta criada com sucesso!');
                req.session.save(() => {
                    res.redirect(`/thoughts/profile/${req.session.userId}/${req.session.userId}`);
                });
        }
        
    }
      
    static async userEdit(req,res){

        const id = req.params.id
        req.session.userId = id
        const user = await User.findOne({where: {id: id}})
        res.render('thoughts/userEdit',{session: req.session, id, user})
    }

    static async userEditPost(req,res){
        const id = req.params.id
        req.session.userId = id
        const user = await User.findOne({where: {id: id}})
        let {name, descricao, state, city} = req.body
        if(state == 'Selecione um Estado'){
            state = user.state
            city = user.city
        }
        let imageUrl
        if(req.file){
            imageUrl = `/uploads/${req.file.filename}`;
        }
        else{
            imageUrl = user.img
        }
        const userUpdate = {

            name,
            img: imageUrl,
            description: descricao,
            state,
            city
        }
        try{
            await User.update(userUpdate,{where:{id:id}})
            req.flash('message', '')
            req.flash('message', 'Atualização realizada com sucesso!')
            req.session.save(() => {

                res.redirect(`/thoughts/profile/${id}/${id}`)
            })
        }
        catch(err){
            console.log(err)
        }
    }

    static async viewUserProfileById(req,res){

        req.session.userId = req.params.requester
        let searched = req.params.id
        const id = req.params.requester
        let selfView = false
        if(id == searched){
            selfView = true
        }
        const user = await User.findOne({where: {id:searched}})
        const eventos = await Evento.findAll({where: {owner: searched}})
        let type
        const locais = await Local.findAll({where:{UserId:searched}})
        const tags = await Tag.findAll({where: {UserId: searched}})
        let hasTags = true
        if(!tags){
            hasTags = false
        }
        const avaliacoes = await Aval.findAll({where: {avaliado: searched}})
        tags.forEach(async tag => {

            tag.talent = await musicalTalent.findOne({where: {id:tag.codMusicalTalent}})
            if(tag.talent.categoria == 'Instrumento'){
                tag.instrumento = true
            }
            else{
                tag.talent.instrumento = false
            }

            if(tag.talent.categoria == 'Gênero Musical'){
                tag.genero = true
            }
            else{
                tag.genero = false
            }
        })
        let media = 0
        if(avaliacoes.length > 0){
            
            avaliacoes.forEach(aval => {

                media += aval.nota
            })
            media = media / avaliacoes.length
        }
        let porcentagem = media / 5 * 100
        if(user.accountType === 'Empresa'){
            type = 1
        }
        else{
            type = 0
        }
        res.render('thoughts/profile', {session: req.session,user,type,selfView,locais,id,media,porcentagem,eventos,tags,hasTags})        
    }
}