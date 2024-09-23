const Mensagem = require("../models/mensagem")
const Fav = require('../models/favoritos')
const User = require('../models/user')
const Notific = require('../models/notificacao')
const session = require("express-session")
const { Op, where } = require('sequelize');

module.exports = class ChatController{

    static async abrirConversas(req,res){

        req.session.userId = req.params.id
        const id = req.params.id
        const favoritos = await Fav.findAll({where: {detentor: id}})
        const conversas = await Mensagem.findAll({where: {[Op.or]:[{remetente: id},{destinatario: id}]}})
        let amigos = []
            
        for (let ele of conversas) {
            if (ele.remetente == id) {
                // Verifique se o destinatário já está na lista de amigos
                const destinatarioId = ele.destinatario;
                if (!amigos.some(amigo => amigo.id === destinatarioId)) {
                    // Busque o usuário se ele não estiver na lista
                    const user = await User.findOne({ where: { id: destinatarioId } });
                    if (user) {
                        amigos.push(user);
                    }
                }
            }
        }
        if(favoritos.length == 0 && conversas.length == 0){
            req.flash('message','')
            req.flash('message','Não há conversas disponíveis')
            res.redirect(`/thoughts/dashboard/${id}`)
        }
        else{
            for (let fav of favoritos) {
                fav.user = await User.findOne({ where: { id: fav.detido } });
                // Verifique se o usuário dos favoritos já está na lista de amigos
                if (!amigos.some(amigo => amigo.id === fav.user.id)) {
                    amigos.push(fav.user);
                }
            }
            const amigo = amigos[0]
            const messages = await Mensagem.findAll({where: {
                [Op.or]: [
                  { remetente: id, destinatario: amigo.id},
                  { remetente: amigo.id , destinatario: id}
                ]}})
            for(let msg of messages){
                if(msg.remetente == id){
                    msg.self = true
                }
                else{
                    msg.self = false
                    msg.visto = true
                    await Mensagem.update({visto: true},{where:{id:msg.id}})
                }
                msg.user = await User.findOne({where:{id: msg.remetente}})
            }
            const user = await User.findOne({where:{id:id}})
            for(let amigo of amigos){
                
                const unseenMessages = await Mensagem.findAll({where: { remetente: amigo.id, destinatario: id, visto: false}})
                amigo.unseen = unseenMessages.length
                amigo.root = id
            }
            const notificacoes = await Notific.findAll({where: {destinatario: user.id,status: true}})
        notificacoes.sort((a, b) => {
            
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
        let numLembretes = notificacoes.length
            res.render('chat/conversas',{session: req.session, user, amigo, amigos,messages,notificacoes,numLembretes})
        }
    }

    static async Conversar(req,res){

        req.session.userId = req.params.requisitante
        const amigoId = req.params.id
        const id = req.params.requisitante
        const favoritos = await Fav.findAll({where: {detentor: id}})
        const conversas = await Mensagem.findAll({where: {[Op.or]:[{remetente: id},{destinatario: id}]}})
        let amigos = []
            
        for (let ele of conversas) {
            if (ele.remetente == id) {
                // Verifique se o destinatário já está na lista de amigos
                const destinatarioId = ele.destinatario;
                if (!amigos.some(amigo => amigo.id === destinatarioId)) {
                    // Busque o usuário se ele não estiver na lista
                    const user = await User.findOne({ where: { id: destinatarioId } });
                    if (user) {
                        amigos.push(user);
                    }
                }
            }
        }
        for (let fav of favoritos) {
            fav.user = await User.findOne({ where: { id: fav.detido } });
            // Verifique se o usuário dos favoritos já está na lista de amigos
            if (!amigos.some(amigo => amigo.id === fav.user.id)) {
                amigos.push(fav.user);
            }
        }
        const messages = await Mensagem.findAll({where: {
            [Op.or]: [
                { remetente: id, destinatario: amigoId},
                { remetente: amigoId , destinatario: id}
            ]}})
        for(let msg of messages){
            if(msg.remetente == id){
                msg.self = true
            }
            else{
                msg.self = false
                msg.visto = true
                await Mensagem.update({visto: true},{where:{id:msg.id}})
            }
            msg.user = await User.findOne({where:{id: msg.remetente}})
        }
        const user = await User.findOne({where:{id:id}})
        for(let amigo of amigos){
            
            const unseenMessages = await Mensagem.findAll({where: { remetente: amigo.id, destinatario: id, visto: false}})
            amigo.unseen = unseenMessages.length
            amigo.root = id
        }
        let amigo = await User.findOne({where: {id: amigoId}})
        const notificacoes = await Notific.findAll({where: {destinatario: id,status: true}})
        notificacoes.sort((a, b) => {
            
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
        let numLembretes = notificacoes.length
        res.render('chat/conversas',{session: req.session, user, amigo, amigos,messages,notificacoes,numLembretes})
        }

}