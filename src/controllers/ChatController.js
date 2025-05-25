const { Op } = require('sequelize');

const User = require("../models/User");
const Artist = require('../models/Artist');
const Establishment = require('../models/Establishment');

module.exports = class ChatController {

    static async showChat(req, res) {
        if (!req.session.userid) {
            return res.redirect('/login')
        }

        const user = await User.findByPk(req.session.userid)
        const contactId = req.params.id

        // Buscar o contato (outro usuário)
        const contact = await User.findByPk(contactId)

        // Buscar mensagens entre user e contact (exemplo)
        // const messages = await Chat.findAll({ ... })

        return res.render('app/chat/chat', {
            css: 'chat.css',
            user,
            contactId,
            contact,
            // messages,
            //pageTitle: 'Chat',
            //headerSystemTitle: 'ChatSystem'
        })
    }
}
