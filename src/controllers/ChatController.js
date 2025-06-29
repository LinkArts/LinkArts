const { Op } = require("sequelize");
const { getIo } = require("../websocket_setup");
const handlebars = require("handlebars");

const User = require("../models/User");
const Message = require("../models/Message");
const Chat = require("../models/Chat");

const { Artist, Establishment } = require('../models');

if (!handlebars.helpers.substring) {
    handlebars.registerHelper("substring", function(str, start, length) {
        if (!str) return "";
        return str.substring(start, start + length);
    });
}

module.exports = class ChatController {
    static async showChatPage(req, res) {
        if (!req.session.userid) {
            return res.redirect("/login");
        }

        const userId = req.session.userid;

        try {
            const user = await User.findByPk(userId);

            if (!user) {
                return res.redirect("/login");
            }

            const chats = await user.getChats({
                include: [
                    {
                        model: User,
                        through: { attributes: [] },
                        where: {
                            id: { [Op.ne]: userId }
                        },
                        attributes: ["id", "name"]
                    },
                    {
                        model: Message,
                        limit: 1,
                        order: [["createdAt", "DESC"]],
                        attributes: ["message", "createdAt"]
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

            return res.render("app/chat/chat", {
                css: "chat.css",
                user: user.get({ plain: true }),
                chats: formattedChats
            });

        } catch (error) {
            console.error("Erro ao buscar chats (showChatPage):", error);
            req.flash("error_msg", "Falha ao carregar os chats. Por favor, tente novamente.");
            return res.redirect("/");
        }
    }

    static async getChatsApi(req, res) {
        if (!req.session.userid) {
            return res.status(401).json({ message: "Não autorizado" });
        }
        const userId = parseInt(req.session.userid, 10);

        try {
            const user = await User.findByPk(userId);
            if (!user) {
                 return res.status(401).json({ message: "Usuário não encontrado" });
            }

            const chats = await user.getChats({
                include: [
                    {
                        model: User,
                        through: { attributes: [] },
                        attributes: ["id", "name", "description", "city", "state", "imageUrl"]
                    },
                    {
                        model: Message,
                        limit: 1,
                        order: [["createdAt", "DESC"]],
                        attributes: ["message", "createdAt"]
                    }
                ]
            });

            const formattedChats = chats.map(chat => {
                const otherUsers = chat.Users.filter(u => u.id !== userId);
                const otherUser = otherUsers.length > 0 ? otherUsers[0] : null;
                const latestMessage = chat.Messages.length > 0 ? chat.Messages[0] : null;

                return {
                    chatId: chat.id,
                    otherUser: otherUser ? { 
                        id: otherUser.id, 
                        name: otherUser.name, 
                        description: otherUser.description, 
                        city: otherUser.city,
                        state: otherUser.state,
                        imageUrl: otherUser.imageUrl
                    } : null,
                    latestMessage: latestMessage ? { content: latestMessage.message, createdAt: latestMessage.createdAt } : null,
                    isGroupChat: otherUsers.length > 1,
                    participantCount: otherUsers.length + 1
                };
            });

             formattedChats.sort((a, b) => {
                const dateA = a.latestMessage ? new Date(a.latestMessage.createdAt) : new Date(0);
                const dateB = b.latestMessage ? new Date(b.latestMessage.createdAt) : new Date(0);
                return dateB - dateA;
            });

            return res.status(200).json(formattedChats);

        } catch (error) {
            console.error("Erro ao buscar chats (API):", error);
            return res.status(500).json({ message: "Falha ao carregar chats via API." });
        }
    }

    static async getChatMessages(req, res) {
        if (!req.session.userid) {
            return res.status(401).json({ message: "Não autorizado" });
        }

        const chatId = req.params.chatId;
        const userId = req.session.userid;
        const limit = parseInt(req.query.limit) || 30;
        const offset = parseInt(req.query.offset) || 0;

        try {
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
                return res.status(404).json({ message: "Chat não encontrado ou você não tem permissão para acessá-lo." });
            }

            const participants = await chat.getUsers({
                attributes: ["id", "name", "description", "city", "imageUrl"]
            });

            let otherUser = null;
            if (participants.length >= 2) {
                otherUser = participants.find(participant => participant.id !== userId);
            }

            const { count, rows: messages } = await Message.findAndCountAll({
                where: { chatid: chatId },
                include: [
                    {
                        model: User,
                        attributes: ["id", "name", "imageUrl"]
                    }
                ],
                order: [["date", "ASC"]],
                limit: limit,
                offset: offset
            });

            const formattedMessages = messages.map(msg => ({
                id: msg.id,
                message: msg.message,
                date: msg.date,
                userid: msg.userid,
                sender: msg.User ? {
                    id: msg.User.id,
                    name: msg.User.name
                } : null,
            }));

            return res.status(200).json({
                messages: formattedMessages,
                totalMessages: count,
                limit: limit,
                offset: offset,
                otherUser: otherUser ? {
                    id: otherUser.id,
                    name: otherUser.name,
                    description: otherUser.description,
                    city: otherUser.city,
                    imageUrl: otherUser.imageUrl
                } : null,
                chatId: chat.id
            });

        } catch (error) {
            return res.status(500).json({ message: "Falha ao carregar mensagens via API." });
        }
    }

    static async sendMessageApi(req, res) {
        if (!req.session.userid) {
            return res.status(401).json({ message: "Não autorizado" });
        }

        const chatId = req.params.chatId;
        const userId = req.session.userid;
        const { message } = req.body;

        try {
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
                return res.status(404).json({ message: "Chat não encontrado ou você não tem permissão para enviar mensagens." });
            }

            const newMessage = await Message.create({
                message: message,
                chatid: chatId,
                userid: userId,
                date: new Date(),
            });

            const sender = await User.findByPk(userId, { attributes: ["id", "name", "imageUrl"] });

            const socketData = {
                id: newMessage.id,
                message: newMessage.message,
                date: newMessage.date,
                chatId: parseInt(chatId),
                sender: {
                    id: sender.id,
                    name: sender.name
                }
            };

            try {
                const io = getIo();
                if (io) {
                    io.to(chatId.toString()).emit("new_message", socketData);
                } else {
                    console.warn(`sendMessageApi: Socket.IO não disponível para chat ${chatId}`);
                }
            } catch (socketError) {
                console.error(`sendMessageApi: Erro ao emitir evento Socket.IO para chat ${chatId}:`, socketError.message);
            }

            return res.status(201).json({
                id: newMessage.id,
                message: newMessage.message,
                date: newMessage.date,
                userid: newMessage.userid,
                sender: {
                    id: sender.id,
                    name: sender.name
                }
            });

        } catch (error) {
            console.error(`sendMessageApi: Erro para chat ${chatId} user ${userId}:`, error);
            return res.status(500).json({ message: "Falha ao enviar mensagem." });
        }
    }

    static async createChat(req, res) {
        if (!req.session.userid) {
            return res.redirect("/login");
        }
        
        const userId = req.session.userid;
        const otherUserId = parseInt(req.params.id, 10);

        if (!otherUserId || otherUserId === userId) {
            return res.status(400).json({ message: "ID do outro usuário inválido." });
        }

        try {
            const existingChats = await Chat.findAll({
                include: [{
                    model: User,
                    where: { id: [userId, otherUserId] },
                    through: { attributes: [] }
                }]
            });

            const chat = existingChats.find(c =>
                c.Users.length === 2 &&
                c.Users.some(u => u.id === userId) &&
                c.Users.some(u => u.id === otherUserId)
            );

            if (chat) {
                return res.redirect(`/chat/${chat.id}`);
            }

            const newChat = await Chat.create();
            await newChat.addUsers([userId, otherUserId]);

            return res.redirect(`/chat/${newChat.id}`);
        } catch (error) {
            console.error("Erro ao criar chat:", error);
            return res.status(500).json({ message: "Falha ao criar chat." });
        }
    }

    static async getChatHtml(req, res) {
        if (!req.session.userid) {
            return res.status(401).json({ message: "Não autorizado" });
        }
        const chatId = parseInt(req.params.chatId, 10);
        const userId = parseInt(req.session.userid, 10);

        try {
            const chat = await Chat.findOne({
                where: { id: chatId },
                include: [
                    {
                        model: User,
                        through: { attributes: [] },
                        attributes: ["id", "name", "description", "city", "state", "instagram", "facebook", "linkedin", "imageUrl"]
                    },
                ]
            });
            
            if (!chat || !chat.Users.some(u => u.id === userId)) {
                return res.status(404).json({ message: "Chat não encontrado ou acesso negado." });
            }

            const otherUsers = chat.Users.filter(u => u.id !== userId);
            const otherUser = otherUsers.length > 0 ? otherUsers[0] : null;

            let otherUserDetails = null;
            if (otherUser) {
                try {
                    const artist = await Artist.findOne({ where: { userid: otherUser.id } });
                    if (artist) {
                        otherUserDetails = {
                            ...otherUser.dataValues,
                            userType: 'artist',
                            profession: 'Artista',
                            additionalInfo: artist.dataValues
                        };
                    } else {
                        const establishment = await Establishment.findOne({ where: { userid: otherUser.id } });
                        if (establishment) {
                            otherUserDetails = {
                                ...otherUser.dataValues,
                                userType: 'establishment',
                                profession: 'Estabelecimento',
                                additionalInfo: establishment.dataValues
                            };
                        } else {
                            otherUserDetails = {
                                ...otherUser.dataValues,
                                userType: 'user',
                                profession: 'Usuário'
                            };
                        }
                    }
                } catch (profileError) {
                    console.error(`[getChatHtml] Erro ao buscar detalhes do perfil:`, profileError);
                    otherUserDetails = {
                        ...otherUser.dataValues,
                        userType: 'user',
                        profession: 'Usuário'
                    };
                }
            }

            const messages = await Message.findAll({
                where: { chatid: chatId },
                include: [{ model: User, attributes: ["id", "name", "imageUrl"] }],
                order: [["date", "ASC"]]
            });

            const formatTime = (date) => {
                if (!date) return "";
                try {
                    const messageDate = new Date(date);
                    return messageDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                } catch (error) {
                    return "";
                }
            };

            const formattedMessages = [];
            let lastDate = null;

            try {
                messages.forEach(msg => {
                    try {
                        let msgDate = new Date(msg.date);
                        if (isNaN(msgDate.getTime())) {
                            console.error(`[getChatHtml] Data inválida na mensagem ${msg.id}:`, msg.date);
                            msgDate = new Date();
                        }
                        
                        const currentDate = msgDate.toDateString();

                        if (lastDate && lastDate !== currentDate) {
                            const today = new Date();
                            const yesterday = new Date(today);
                            yesterday.setDate(yesterday.getDate() - 1);
                            
                            let dateText;
                            if (currentDate === today.toDateString()) {
                                dateText = "Hoje";
                            } else if (currentDate === yesterday.toDateString()) {
                                dateText = "Ontem";
                            } else {
                                try {
                                    dateText = msgDate.toLocaleDateString("pt-BR", { 
                                        day: "2-digit", 
                                        month: "2-digit", 
                                        year: "numeric" 
                                    });
                                } catch (dateFormatError) {
                                    console.error(`[getChatHtml] Erro ao formatar data:`, dateFormatError);
                                    dateText = "Data não disponível";
                                }
                            }
                            
                            formattedMessages.push({
                                isDaySeparator: true,
                                dateText: dateText
                            });
                        }
                        
                        formattedMessages.push({
                            id: msg.id,
                            message: msg.message || "",
                            date: formatTime(msg.date),
                            userid: msg.userid,
                            sender: msg.User ? { id: msg.User.id, name: msg.User.name || "Usuário" } : null,
                            isCurrentUser: msg.userid === userId
                        });
                        
                        lastDate = currentDate;
                    } catch (msgError) {
                        console.error(`[getChatHtml] Erro ao formatar mensagem ${msg.id}:`, msgError);
                        formattedMessages.push({
                            id: msg.id || Date.now(),
                            message: "Erro ao carregar mensagem",
                            date: formatTime(new Date()),
                            userid: msg.userid || 0,
                            sender: { id: 0, name: "Sistema" },
                            isCurrentUser: false
                        });
                    }
                });
            } catch (formatError) {
                console.error(`[getChatHtml] Erro geral ao formatar mensagens:`, formatError);
                formattedMessages.push({
                    id: Date.now(),
                    message: "Erro ao carregar mensagens do chat",
                    date: formatTime(new Date()),
                    userid: 0,
                    sender: { id: 0, name: "Sistema" },
                    isCurrentUser: false
                });
            }

            let messagesHtml, chatHeaderHtml, profileHtml;

            try {
                messagesHtml = await new Promise((resolve, reject) => {
                    res.render("partials/message", { messages: formattedMessages, layout: false }, (err, html) => {
                        if (err) { 
                            console.error(`[getChatHtml] Erro no template de mensagens:`, err);
                            reject(err); 
                        } else { 
                            resolve(html); 
                        }
                    });
                });
            } catch (err) {
                console.error(`[getChatHtml] Falha ao renderizar mensagens:`, err);
                messagesHtml = formattedMessages.length > 0 
                    ? '<p class="error-message">Erro ao carregar mensagens. <button onclick="window.location.reload()">Tentar novamente</button></p>'
                    : '<p class="no-messages">Nenhuma mensagem ainda. Envie a primeira!</p>';
            }

            try {
                chatHeaderHtml = await new Promise((resolve, reject) => {
                    res.render("partials/chat-header", { otherUser: otherUserDetails, layout: false }, (err, html) => {
                        if (err) { 
                            console.error(`[getChatHtml] Erro no template de header:`, err);
                            reject(err); 
                        } else { 
                            resolve(html); 
                        }
                    });
                });
            } catch (err) {
                console.error(`[getChatHtml] Falha ao renderizar header:`, err);
                const userName = otherUserDetails?.name || 'Usuário desconhecido';
                chatHeaderHtml = `
                    <div class="chat-user">
                        <div class="profile-avatar" style="width: 40px; height: 40px; background: url('/img/default.jpg') center/cover; border-radius: 50%;"></div>
                        <div class="chat-user-info">
                            <div class="chat-user-name" style="font-size: 16px; font-weight: 600; color: #333; line-height: 1.2;">
                                ${userName}
                            </div>

                        </div>
                    </div>
                    <button class="report-button" disabled>Reportar conversa</button>
                `;
            }

            try {
                profileHtml = await new Promise((resolve, reject) => {
                    res.render("partials/profile", { otherUser: otherUserDetails, layout: false }, (err, html) => {
                        if (err) { 
                            console.error(`[getChatHtml] Erro no template de perfil:`, err);
                            reject(err); 
                        } else { 
                            resolve(html); 
                        }
                    });
                });
            } catch (err) {
                console.error(`[getChatHtml] Falha ao renderizar perfil:`, err);
                profileHtml = otherUserDetails 
                    ? `<p class="error-message">Erro ao carregar perfil de ${otherUserDetails.name}. <button onclick="window.location.reload()">Tentar novamente</button></p>`
                    : '<p>Selecione uma conversa para ver o perfil.</p>';
            }

            res.json({
                messagesHtml,
                chatHeaderHtml,
                profileHtml,
                otherUser: otherUserDetails ? {
                    id: otherUserDetails.id,
                    name: otherUserDetails.name,
                    description: otherUserDetails.description,
                    city: otherUserDetails.city,
                    state: otherUserDetails.state,
                    userType: otherUserDetails.userType,
                    profession: otherUserDetails.profession
                } : null,
                chatParticipants: otherUsers.length + 1,
                isGroupChat: otherUsers.length > 1
            });

        } catch (error) {
            console.error(`[getChatHtml] Erro geral no método getChatHtml para chat ${chatId}:`, error);
            console.error(`[getChatHtml] Stack trace:`, error.stack);
            res.status(500).json({ 
                message: "Erro interno do servidor ao carregar chat.",
                messagesHtml: '<p class="error-message">Erro ao carregar mensagens. <button onclick="window.location.reload()">Tentar novamente</button></p>',
                chatHeaderHtml: '<p class="error-message">Erro ao carregar header. <button onclick="window.location.reload()">Tentar novamente</button></p>',
                profileHtml: '<p class="error-message">Erro ao carregar perfil. <button onclick="window.location.reload()">Tentar novamente</button></p>',
                otherUser: null
            });
        }
    }

    static async setTypingStatus(req, res) {
        if (!req.session.userid) {
            return res.status(401).json({ message: "Não autorizado" });
        }
        const chatId = parseInt(req.params.chatId, 10);
        const userId = parseInt(req.session.userid, 10);
        const { isTyping } = req.body;

        try {
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
                return res.status(404).json({ message: "Chat não encontrado." });
            }

            const io = getIo();
            if (io) {
                const eventName = isTyping ? "user_typing" : "user_stopped_typing";
                io.to(chatId.toString()).emit(eventName, {
                    userId: userId,
                    chatId: chatId,
                    timestamp: new Date()
                });
            } else {
                console.warn("setTypingStatus: Socket.IO não inicializado (io é undefined).");
            }

            res.status(200).json({ success: true });

        } catch (error) {
            console.error("setTypingStatus: Erro interno do servidor:", error);
            res.status(500).json({ message: "Erro interno do servidor." });
        }
    }

    static async getNavbarChatsApi(req, res) {
        if (!req.session.userid) {
            return res.status(401).json({ message: "Não autorizado" });
        }
        const userId = parseInt(req.session.userid, 10);

        try {
            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(401).json({ message: "Usuário não encontrado" });
            }

            const chats = await user.getChats({
                include: [
                    {
                        model: User,
                        through: { attributes: [] },
                        attributes: ["id", "name", "imageUrl"]
                    },
                    {
                        model: Message,
                        limit: 1,
                        order: [["createdAt", "DESC"]],
                        attributes: ["message", "createdAt"]
                    }
                ],
                limit: 4,
                order: [["updatedAt", "DESC"]]
            });

            const formattedChats = chats.map(chat => {
                const otherUser = chat.Users.find(u => u.id !== userId);
                const latestMessage = chat.Messages.length > 0 ? chat.Messages[0] : null;

                return {
                    chatId: chat.id,
                    otherUser: {
                        id: otherUser?.id || null,
                        name: otherUser?.name || "Usuário desconhecido",
                        imageUrl: otherUser?.imageUrl || null
                    },
                    latestMessage: latestMessage ? {
                        content: latestMessage.message.length > 40 
                            ? latestMessage.message.substring(0, 40) + "..." 
                            : latestMessage.message,
                        createdAt: latestMessage.createdAt
                    } : {
                        content: "Sem mensagens",
                        createdAt: null
                    }
                };
            });

            return res.status(200).json(formattedChats);

        } catch (error) {
            console.error("Erro ao buscar chats para navbar:", error);
            return res.status(500).json({ message: "Falha ao carregar chats." });
        }
    }
};

