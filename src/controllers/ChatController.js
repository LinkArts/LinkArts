const { Op } = require("sequelize");
const { getIo } = require('../websocket_setup'); // Importar getIo

const User = require("../models/User");
const Message = require('../models/Message');
const Chat = require('../models/Chat');

module.exports = class ChatController {

    // Método original para renderizar a página (mantido como no original)
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
                        attributes: ['message', 'createdAt']
                    }
                ],
            });

            const formattedChats = chats.map(chat => {
                const otherUser = chat.Users.find(u => u.id !== userId);
                const latestMessage = chat.Messages.length > 0 ? chat.Messages[0] : null;

                return {
                    chatId: chat.id,
                    otherUser: otherUser ? { id: otherUser.id, name: otherUser.name } : null,
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
            console.error("Erro ao buscar chats (showChatPage):", error);
            req.flash('error_msg', 'Falha ao carregar os chats. Por favor, tente novamente.');
            return res.redirect('/');
        }
    }

    // --- API: Obter lista de chats do usuário logado --- (mantido como no original)
    static async getChatsApi(req, res) {
        if (!req.session.userid) {
            return res.status(401).json({ message: 'Não autorizado' });
        }
        const userId = req.session.userid;

        try {
            const user = await User.findByPk(userId);
            if (!user) {
                 return res.status(401).json({ message: 'Usuário não encontrado' });
            }

            // Busca todos os chats do usuário, incluindo TODOS os usuários do chat
            const chats = await user.getChats({
                include: [
                    {
                        model: User,
                        through: { attributes: [] },
                        attributes: ['id', 'name', 'description'] // Traz todos os campos necessários
                    },
                    {
                        model: Message,
                        limit: 1,
                        order: [['createdAt', 'DESC']],
                        attributes: ['message', 'createdAt']
                    }
                ]
            });

            // Formata para o frontend
            const formattedChats = chats.map(chat => {
                // Identifica o outro usuário (diferente do logado)
                const otherUser = chat.Users.find(u => u.id !== userId);
                const latestMessage = chat.Messages.length > 0 ? chat.Messages[0] : null;

                return {
                    chatId: chat.id,
                    otherUser: otherUser ? { id: otherUser.id, name: otherUser.name, description: otherUser.description } : null,
                    latestMessage: latestMessage ? { content: latestMessage.message, createdAt: latestMessage.createdAt } : null,
                };
            });
            
             // Ordena novamente no JS caso a ordenação do include não seja perfeita
             formattedChats.sort((a, b) => {
                const dateA = a.latestMessage ? new Date(a.latestMessage.createdAt) : new Date(0);
                const dateB = b.latestMessage ? new Date(b.latestMessage.createdAt) : new Date(0);
                return dateB - dateA;
            });

            return res.status(200).json(formattedChats);

        } catch (error) {
            console.error("Erro ao buscar chats (API):", error);
            return res.status(500).json({ message: 'Falha ao carregar chats via API.' });
        }
    }

    // --- API: Obter mensagens de um chat específico --- (Modificado para incluir paginação)
    static async getChatMessages(req, res) {
        if (!req.session.userid) {
            return res.status(401).json({ message: 'Não autorizado' });
        }

        const chatId = req.params.chatId;
        const userId = req.session.userid;
        const limit = req.query.limit || 30;
        const offset = req.query.offset || 0;

        try {
            // Verifica se o usuário pertence ao chat
            const chat = await Chat.findOne({
                where: { id: chatId },
                include: [
                    {
                        model: User,
                        where: { id: userId },
                        attributes: [],
                        through: { attributes: [] }
                    },
                    {
                        model: User,
                        where: { id: { [Op.ne]: userId } },
                        attributes: ['id'], // Só pega o id para buscar depois
                        through: { attributes: [] }
                    }
                ]
            });

            if (!chat) {
                return res.status(404).json({ message: 'Chat não encontrado ou você não tem permissão para acessá-lo.' });
            }

            // Busca o outro usuário diretamente na tabela Users
            let otherUser = null;
            if (chat.Users && chat.Users.length > 0) {
                const otherUserId = chat.Users[0].id;
                otherUser = await User.findByPk(otherUserId, {
                    attributes: ['id', 'name', 'description']
                });
            }

            // Busca as mensagens do chat com paginação
            const { count, rows: messages } = await Message.findAndCountAll({
                where: { chatid: chatId },
                include: [
                    {
                        model: User,
                        attributes: ['id', 'name']
                    }
                ],
                order: [['date', 'ASC']], // Ordena por 'date'
                limit: limit,
                offset: offset
            });

            // Formata as mensagens para o frontend
            const formattedMessages = messages.map(msg => ({
                id: msg.id,
                message: msg.message,
                date: msg.date, // Usa o campo 'date'
                userid: msg.userid,
                sender: msg.User ? {
                    id: msg.User.id,
                    name: msg.User.name
                } : null,
            }));

            // Retorna as mensagens e informações do outro usuário
            return res.status(200).json({
                messages: formattedMessages,
                totalMessages: count,
                limit: limit,
                offset: offset,
                otherUser: otherUser ? {
                    id: otherUser.id,
                    name: otherUser.name,
                    description: otherUser.description
                } : null,
                chatId: chat.id
            });

        } catch (error) {
            console.error("Erro ao buscar mensagens (API):", error);
            return res.status(500).json({ message: 'Falha ao carregar mensagens via API.' });
        }
    }

    // --- API: Enviar nova mensagem para um chat --- (Modificado para emitir WebSocket)
    static async sendMessageApi(req, res) {
        if (!req.session.userid) {
            return res.status(401).json({ message: 'Não autorizado' });
        }

        const chatId = req.params.chatId;
        const userId = req.session.userid;
        const { message } = req.body; // Pega o conteúdo da mensagem do corpo da requisição

        // Validação já ocorre na rota com express-validator

        try {
            // Verifica se o usuário pertence ao chat antes de permitir enviar mensagem
            const chat = await Chat.findOne({
                where: { id: chatId },
                include: [
                    {
                        model: User,
                        where: { id: userId },
                        attributes: [],
                        through: { attributes: [] }
                    }
                ]
            });

            if (!chat) {
                return res.status(404).json({ message: 'Chat não encontrado ou você não tem permissão para enviar mensagens.' });
            }

            // Cria a mensagem no banco de dados
            const newMessage = await Message.create({
                message: message,
                chatid: chatId,
                userid: userId, // Associa ao usuário logado
                date: new Date(), // Garante que o campo 'date' seja preenchido
            });

            // Busca a mensagem recém-criada incluindo o remetente para retornar ao frontend e emitir via WebSocket
            const sentMessage = await Message.findByPk(newMessage.id, {
                include: [
                    {
                        model: User,
                        attributes: ['id', 'name']
                    }
                ]
            });
            
             // Formata para o frontend
            const formattedSentMessage = {
                id: sentMessage.id,
                message: sentMessage.message,
                date: sentMessage.date || sentMessage.createdAt, // sempre envia 'date'
                sender: sentMessage.User ? { id: sentMessage.User.id, name: sentMessage.User.name } : null,
                isCurrentUser: false, // Será tratado no cliente
                chatId: chatId // Adiciona o chatId para o frontend identificar
            };

            // *** EMITIR EVENTO WEBSOCKET ***
            try {
                const io = getIo();
                // Emite para a sala específica do chat
                io.to(chatId.toString()).emit('new_message', formattedSentMessage);
                console.log('Mensagem emitida via WebSocket para o chat:', chatId, formattedSentMessage);
            } catch (wsError) {
                console.error("Erro ao emitir mensagem via WebSocket:", wsError);
                // Não falha a requisição HTTP por causa do WS, mas loga o erro.
            }
            // *******************************

            // Retorna a mensagem criada com status 201 para o remetente original via HTTP
            return res.status(201).json(formattedSentMessage); // Retorna a mesma mensagem formatada

        } catch (error) {
            console.error("Erro ao enviar mensagem (API):", error);
            return res.status(500).json({ message: 'Falha ao enviar mensagem via API.' });
        }
    }

    // Método createChat original (mantido como no original)
    static async createChat(req, res) {
        if (!req.session.userid) {
            return res.status(401).json({ message: 'Não autorizado' });
        }
        
        const userId = req.session.userid;
        const otherUserId = parseInt(req.params.id, 10);

        if (!otherUserId || otherUserId === userId) {
            return res.status(400).json({ message: 'ID do outro usuário inválido.' });
        }

        try {
            // Verifica se já existe um chat entre os dois usuários
            const existingChats = await Chat.findAll({
                include: [{
                    model: User,
                    where: { id: [userId, otherUserId] },
                    through: { attributes: [] }
                }]
            });

            // Filtra chats que têm exatamente os dois usuários
            const chat = existingChats.find(c =>
                c.Users.length === 2 &&
                c.Users.some(u => u.id === userId) &&
                c.Users.some(u => u.id === otherUserId)
            );

            if (chat) {
                // Chat já existe, redireciona para o chat existente
                return res.redirect(`/chat/${chat.id}`);
            }

            // Cria novo chat e associa os dois usuários
            const newChat = await Chat.create();
            await newChat.addUsers([userId, otherUserId]);

            // Redireciona para o novo chat
            return res.redirect(`/chat/${newChat.id}`);
        } catch (error) {
            console.error("Erro ao criar chat:", error);
            return res.status(500).json({ message: 'Falha ao criar chat.' });
        }
    }

    // --- API: Obter HTML dos blocos do chat (mensagens, header, perfil) ---
    static async getChatHtml(req, res) {
        if (!req.session.userid) {
            return res.status(401).json({ message: 'Não autorizado' });
        }
        const chatId = req.params.chatId;
        const userId = req.session.userid;
        try {
            // Busca o chat e valida se o usuário pertence
            const chat = await Chat.findOne({
                where: { id: chatId },
                include: [
                    {
                        model: User,
                        through: { attributes: [] },
                    },
                ]
            });
            if (!chat || !chat.Users.some(u => u.id == userId)) {
                return res.status(404).json({ message: 'Chat não encontrado ou acesso negado.' });
            }
            // Identifica o outro usuário
            const otherUserRef = chat.Users.find(u => u.id != userId);
            let otherUser = null;
            if (otherUserRef) {
                otherUser = await User.findByPk(otherUserRef.id, {
                    attributes: ['id', 'name', 'description', 'city']
                });
            }
            console.log('otherUser passado para chat-header:', otherUser);
            // Busca mensagens do chat
            const messages = await Message.findAll({
                where: { chatid: chatId },
                include: [{ model: User, attributes: ['id', 'name'] }],
                order: [['date', 'ASC']]
            });
            // Formata mensagens para o parcial
            const formattedMessages = messages.map(msg => ({
                id: msg.id,
                message: msg.message,
                date: msg.date,
                userid: msg.userid,
                sender: msg.User ? { id: msg.User.id, name: msg.User.name } : null,
                isCurrentUser: msg.userid == userId
            }));
            // Renderiza os parciais
            const messagesHtml = await new Promise((resolve, reject) => {
                res.render('partials/message', { messages: formattedMessages, layout: false }, (err, html) => {
                    if (err) reject(err); else resolve(html);
                });
            });
            const chatHeaderHtml = await new Promise((resolve, reject) => {
                res.render('partials/chat-header', { otherUser, layout: false }, (err, html) => {
                    if (err) reject(err); else resolve(html);
                });
            });
            console.log('otherUser passado para profile:', otherUser);
            const profileHtml = await new Promise((resolve, reject) => {
                res.render('partials/profile', { otherUser, layout: false }, (err, html) => {
                    if (err) reject(err); else resolve(html);
                });
            });
            return res.json({ messagesHtml, chatHeaderHtml, profileHtml });
        } catch (error) {
            console.error('Erro ao buscar HTML do chat:', error);
            return res.status(500).json({ message: 'Erro ao buscar HTML do chat.' });
        }
    }
}

