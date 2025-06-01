const { Op } = require('sequelize');

const User = require("../models/User");
const Message = require('../models/Message');
const Chat = require('../models/Chat');

module.exports = class ChatController {

    static async showChatPage(req, res) {
        if (!req.session.userid) {
            return res.redirect('/login');
        }

        const userId = req.session.userid;

        try {
            const user = await User.findByPk(userId);

            if (!user) {
                return res.redirect('/login');
            }

            const chats = await user.getChats({
                include: [
                    {
                        model: User,
                        through: { attributes: [] },
                        where: {
                            id: { [Op.ne]: userId }
                        },
                        attributes: ['id', 'name']
                    },
                    {
                        model: Message,
                        limit: 1,
                        order: [['createdAt', 'DESC']],
                        // ALTERADO AQUI: 'content' para 'message'
                        attributes: ['message', 'createdAt'] // <-- AQUI A MUDANÇA
                    }
                ],
            });

            const formattedChats = chats.map(chat => {
                const otherUser = chat.Users.find(u => u.id !== userId);
                const latestMessage = chat.Messages.length > 0 ? chat.Messages[0] : null;

                return {
                    chatId: chat.id,
                    otherUser: otherUser ? { id: otherUser.id, name: otherUser.name } : null,
                    // ALTERADO AQUI: agora o conteúdo da mensagem está em 'latestMessage.message'
                    latestMessage: latestMessage ? { content: latestMessage.message, createdAt: latestMessage.createdAt } : null,
                };
            });

            formattedChats.sort((a, b) => {
                const dateA = a.latestMessage ? new Date(a.latestMessage.createdAt) : new Date(0);
                const dateB = b.latestMessage ? new Date(b.latestMessage.createdAt) : new Date(0);
                return dateB - dateA;
            });


            return res.render('app/chat/chat', {
                css: 'chat.css',
                user: user.get({ plain: true }),
                chats: formattedChats
            });

        } catch (error) {
            console.error("Erro ao buscar chats:", error);
            req.flash('error_msg', 'Falha ao carregar os chats. Por favor, tente novamente.');
            return res.redirect('/');
        }
    }

    // --- Método para buscar todas as mensagens de um chat específico ---
    static async getChatMessages(req, res) {
        if (!req.session.userid) {
            return res.status(401).json({ message: 'Não autorizado' });
        }

        const chatId = req.params.chatId;
        const userId = req.session.userid;

        try {
            const chat = await Chat.findOne({
                where: { id: chatId },
                include: [
                    {
                        model: User,
                        where: { id: userId },
                        attributes: []
                    }
                ]
            });

            if (!chat) {
                return res.status(404).json({ message: 'Chat não encontrado ou você não é um participante.' });
            }

            const messages = await Message.findAll({
                where: { ChatId: chatId },
                include: [
                    {
                        model: User,
                        attributes: ['id', 'name']
                    }
                ],
                order: [['createdAt', 'ASC']]
            });

            // Mapeie as mensagens para garantir que o conteúdo seja acessível como 'content' na resposta JSON, se desejar
            const formattedMessages = messages.map(msg => ({
                id: msg.id,
                message: msg.message, // O conteúdo da mensagem em si
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt,
                sender: msg.User ? { id: msg.User.id, name: msg.User.name } : null,
                // Se você quiser que o frontend sempre espere 'content'
                content: msg.message // Adicionando 'content' para compatibilidade se seu frontend já espera isso
            }));


            return res.status(200).json({ messages: formattedMessages }); // Retorna as mensagens formatadas

        } catch (error) {
            console.error("Erro ao buscar mensagens:", error);
            return res.status(500).json({ message: 'Falha ao carregar mensagens.' });
        }
    }
}