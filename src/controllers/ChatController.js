const Mensagem = require("../models/mensagem")
const Fav = require('../models/favoritos')
const User = require('../models/user')
const session = require("express-session")
const { Op, where } = require('sequelize');

module.exports = class ChatController{

    static async abrirConversas(req,res){

        req.session.userId = req.params.id
        const id = req.params.id
        const favoritos = await Fav.findAll({where: {detentor: id}})
        if(favoritos.length == 0){
            req.flash('message','')
            req.flash('message','Não há conversas disponíveis')
            res.redirect(`/thoughts/dashboard/${id}`)
        }
        else{
            console.log(favoritos)
            for(let fav of favoritos){
                fav.user = await User.findOne({where:{id:fav.detido}})
            }
            const amigo = favoritos[0]
            console.log(amigo.user.id,id)
            const messages = await Mensagem.findAll({where: {
                [Op.or]: [
                  { remetente: id, destinatario: amigo.user.id},
                  { remetente: amigo.user.id , destinatario: id}
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
            res.render('chat/conversas',{session: req.session, user, amigo, favoritos,messages})
        }
    }
}