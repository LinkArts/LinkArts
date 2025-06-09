const { Op } = require("sequelize");
const { getIo } = require("../websocket_setup"); // Importar getIo
const handlebars = require("handlebars");

const User = require("../models/User");
const Message = require("../models/Message");
const Chat = require("../models/Chat");

// Registrar helper substring se não existir
if (!handlebars.helpers.substring) {
    handlebars.registerHelper("substring", function(str, start, length) {
        if (!str) return "";
        return str.substring(start, start + length);
    });
}

module.exports = class ChatController {

    // Método original para renderizar a página (mantido como no original)
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

    // --- API: Obter lista de chats do usuário logado ---
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

            // Busca todos os chats do usuário, incluindo TODOS os usuários do chat
            const chats = await user.getChats({
                include: [
                    {
                        model: User,
                        through: { attributes: [] },
                        attributes: ["id", "name", "description", "city", "state"]
                    },
                    {
                        model: Message,
                        limit: 1,
                        order: [["createdAt", "DESC"]],
                        attributes: ["message", "createdAt"]
                    }
                ]
            });

            // Formata para o frontend
            const formattedChats = chats.map(chat => {
                // Identifica os outros usuários (diferente do logado)
                const otherUsers = chat.Users.filter(u => u.id !== userId);
                const otherUser = otherUsers.length > 0 ? otherUsers[0] : null; // Pega o primeiro para chats 1:1
                const latestMessage = chat.Messages.length > 0 ? chat.Messages[0] : null;

                return {
                    chatId: chat.id,
                    otherUser: otherUser ? { 
                        id: otherUser.id, 
                        name: otherUser.name, 
                        description: otherUser.description, 
                        city: otherUser.city,
                        state: otherUser.state
                    } : null,
                    latestMessage: latestMessage ? { content: latestMessage.message, createdAt: latestMessage.createdAt } : null,
                    isGroupChat: otherUsers.length > 1,
                    participantCount: otherUsers.length + 1
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
            return res.status(500).json({ message: "Falha ao carregar chats via API." });
        }
    }

    // --- API: Obter mensagens de um chat específico ---
    static async getChatMessages(req, res) {
        if (!req.session.userid) {
            return res.status(401).json({ message: "Não autorizado" });
        }

        const chatId = parseInt(req.params.chatId, 10);
        const userId = parseInt(req.session.userid, 10);
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
                        attributes: ["id"], // Só pega o id para buscar depois
                        through: { attributes: [] }
                    }
                ]
            });

            if (!chat) {
                return res.status(404).json({ message: "Chat não encontrado ou você não tem permissão para acessá-lo." });
            }

            // Busca o outro usuário diretamente na tabela Users
            let otherUser = null;
            if (chat.Users && chat.Users.length > 0) {
                const otherUserId = chat.Users[0].id;
                otherUser = await User.findByPk(otherUserId, {
                    attributes: ["id", "name", "description", "city"]
                });
            }

            // Busca as mensagens do chat com paginação
            const { count, rows: messages } = await Message.findAndCountAll({
                where: { chatid: chatId },
                include: [
                    {
                        model: User,
                        attributes: ["id", "name"]
                    }
                ],
                order: [["date", "ASC"]], // Ordena por "date"
                limit: limit,
                offset: offset
            });

            // Formata as mensagens para o frontend
            const formattedMessages = messages.map(msg => ({
                id: msg.id,
                message: msg.message,
                date: msg.date, // Usa o campo "date"
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
                    description: otherUser.description,
                    city: otherUser.city
                } : null,
                chatId: chat.id
            });

        } catch (error) {
            console.error("Erro ao buscar mensagens (API):", error);
            return res.status(500).json({ message: "Falha ao carregar mensagens via API." });
        }
    }

    // --- API: Enviar nova mensagem para um chat ---
    static async sendMessageApi(req, res) {
        if (!req.session.userid) {
            console.log("sendMessageApi: Usuário não autenticado.");
            return res.status(401).json({ message: "Não autorizado" });
        }

        const chatId = req.params.chatId;
        const userId = req.session.userid;
        const { message } = req.body; // Pega o conteúdo da mensagem do corpo da requisição

        console.log(`sendMessageApi: Recebida mensagem para chat ${chatId} de user ${userId}: "${message}"`);

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
                console.log(`sendMessageApi: Chat ${chatId} não encontrado ou usuário ${userId} sem permissão.`);
                return res.status(404).json({ message: "Chat não encontrado ou você não tem permissão para enviar mensagens." });
            }

            // Cria a mensagem no banco de dados
            const newMessage = await Message.create({
                message: message,
                chatid: chatId,
                userid: userId, // Associa ao usuário logado
                date: new Date(), // Garante que o campo "date" seja preenchido
            });
            console.log("sendMessageApi: Mensagem criada no DB com ID:", newMessage.id);

            // Busca a mensagem recém-criada incluindo o remetente para retornar ao frontend e emitir via WebSocket
            const sentMessage = await Message.findByPk(newMessage.id, {
                include: [
                    {
                        model: User,
                        attributes: ["id", "name"]
                    }
                ]
            });
            
             // Formata para o frontend
            const formattedSentMessage = {
                id: sentMessage.id,
                message: sentMessage.message,
                date: sentMessage.date || sentMessage.createdAt, // sempre envia "date"
                sender: sentMessage.User ? { id: sentMessage.User.id, name: sentMessage.User.name } : null,
                isCurrentUser: false, // Será tratado no cliente
                chatId: chatId // Adiciona o chatId para o frontend identificar
            };
            console.log("sendMessageApi: Mensagem formatada para envio:", formattedSentMessage);

            // *** EMITIR EVENTO WEBSOCKET ***
            try {
                const io = getIo();
                if (io) {
                    // Emite para a sala específica do chat
                    io.to(chatId.toString()).emit("new_message", formattedSentMessage);
                    console.log("sendMessageApi: Mensagem emitida via WebSocket para o chat:", chatId, formattedSentMessage);
                } else {
                    console.warn("sendMessageApi: Socket.IO não inicializado (io é undefined).");
                }
            } catch (wsError) {
                console.error("sendMessageApi: Erro ao emitir mensagem via WebSocket:", wsError);
                // Não falha a requisição HTTP por causa do WS, mas loga o erro.
            }
            // *******************************

            // Retorna a mensagem criada com status 201 para o remetente original via HTTP
            return res.status(201).json(formattedSentMessage); // Retorna a mesma mensagem formatada

        } catch (error) {
            console.error("sendMessageApi: Erro ao enviar mensagem (API):", error);
            return res.status(500).json({ message: "Falha ao enviar mensagem via API." });
        }
    }

    // Método createChat original (mantido como no original)
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
            return res.status(500).json({ message: "Falha ao criar chat." });
        }
    }

    // --- API: Obter HTML dos blocos do chat (mensagens, header, perfil) ---
    static async getChatHtml(req, res) {
        if (!req.session.userid) {
            console.log("getChatHtml: Usuário não autenticado.");
            return res.status(401).json({ message: "Não autorizado" });
        }
        const chatId = parseInt(req.params.chatId, 10);
        const userId = parseInt(req.session.userid, 10);
        console.log(`getChatHtml: Requisição para chat ${chatId} do usuário ${userId}`);

        try {
            // Busca o chat e valida se o usuário pertence
            const chat = await Chat.findOne({
                where: { id: chatId },
                include: [
                    {
                        model: User,
                        through: { attributes: [] },
                        attributes: ["id", "name", "description", "city", "state", "instagram", "facebook", "linkedin", "cellphone"]
                    },
                ]
            });
            
            if (!chat || !chat.Users.some(u => u.id === userId)) {
                console.log(`getChatHtml: Chat ${chatId} não encontrado ou usuário ${userId} sem permissão.`);
                return res.status(404).json({ message: "Chat não encontrado ou acesso negado." });
            }
            console.log("getChatHtml: Chat encontrado.", chat.id);
            console.log("getChatHtml: Usuários no chat:", chat.Users.map(u => ({ id: u.id, name: u.name })));

            // Identifica todos os outros usuários (para suporte a chats em grupo)
            const otherUsers = chat.Users.filter(u => u.id !== userId);
            const otherUser = otherUsers.length > 0 ? otherUsers[0] : null; // Por enquanto, pega o primeiro
            
            if (otherUser) {
                console.log("getChatHtml: otherUser encontrado:", {
                    id: otherUser.id,
                    name: otherUser.name,
                    description: otherUser.description,
                    city: otherUser.city
                });
            } else {
                console.log("getChatHtml: Nenhum outro usuário encontrado no chat.");
            }

            // Busca informações adicionais do outro usuário (Artist/Establishment)
            let otherUserDetails = null;
            if (otherUser) {
                try {
                    // Verifica se é Artist
                    const { Artist, Establishment } = require('../models');
                    const artist = await Artist.findOne({ where: { userid: otherUser.id } });
                    if (artist) {
                        otherUserDetails = {
                            ...otherUser.dataValues,
                            userType: 'artist',
                            profession: 'Artista',
                            additionalInfo: artist.dataValues
                        };
                    } else {
                        // Verifica se é Establishment
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
                    console.error("getChatHtml: Erro ao buscar detalhes do perfil:", profileError);
                    otherUserDetails = {
                        ...otherUser.dataValues,
                        userType: 'user',
                        profession: 'Usuário'
                    };
                }
            }
            
            // Busca mensagens do chat
            const messages = await Message.findAll({
                where: { chatid: chatId },
                include: [{ model: User, attributes: ["id", "name"] }],
                order: [["date", "ASC"]]
            });
            console.log(`getChatHtml: Encontradas ${messages.length} mensagens para o chat ${chatId}.`);

            // Formata mensagens para o parcial
            const formattedMessages = messages.map(msg => ({
                id: msg.id,
                message: msg.message,
                date: msg.date,
                userid: msg.userid,
                sender: msg.User ? { id: msg.User.id, name: msg.User.name } : null,
                isCurrentUser: msg.userid === userId
            }));
            console.log("getChatHtml: Mensagens formatadas.");

            // Renderiza os parciais com tratamento de erro individual
            let messagesHtml, chatHeaderHtml, profileHtml;

            try {
                messagesHtml = await new Promise((resolve, reject) => {
                    res.render("partials/message", { messages: formattedMessages, layout: false }, (err, html) => {
                        if (err) { reject(err); } else { resolve(html); }
                    });
                });
                console.log("getChatHtml: Partial message renderizado.");
            } catch (err) {
                console.error("Erro ao renderizar partial message:", err);
                messagesHtml = formattedMessages.length > 0 
                    ? '<p class="error-message">Erro ao carregar mensagens. <button onclick="window.location.reload()">Tentar novamente</button></p>'
                    : '<p class="no-messages">Nenhuma mensagem ainda. Envie a primeira!</p>';
            }

            try {
                chatHeaderHtml = await new Promise((resolve, reject) => {
                    res.render("partials/chat-header", { otherUser: otherUserDetails, layout: false }, (err, html) => {
                        if (err) { reject(err); } else { resolve(html); }
                    });
                });
                console.log("getChatHtml: Partial chat-header renderizado.");
            } catch (err) {
                console.error("Erro ao renderizar partial chat-header:", err);
                const userName = otherUserDetails?.name || 'Usuário desconhecido';
                chatHeaderHtml = `
                    <div class="chat-user">
                        <div class="profile-avatar" style="width:40px;height:40px;background:#eee;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2em;">
                            ${userName ? userName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div class="chat-user-info">
                            <h3>${userName}</h3>
                            <div class="typing-indicator" id="typing-indicator" style="display: none; font-size: 0.8em; color: #666; font-style: italic;">
                                digitando...
                            </div>
                        </div>
                    </div>
                    <button class="report-button" disabled>Reportar conversa</button>
                `;
            }

            try {
                profileHtml = await new Promise((resolve, reject) => {
                    res.render("partials/profile", { otherUser: otherUserDetails, layout: false }, (err, html) => {
                        if (err) { reject(err); } else { resolve(html); }
                    });
                });
                console.log("getChatHtml: Partial profile renderizado.");
            } catch (err) {
                console.error("Erro ao renderizar partial profile:", err);
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
                chatParticipants: otherUsers.length + 1, // Total de participantes
                isGroupChat: otherUsers.length > 1
            });
            console.log("getChatHtml: Resposta JSON enviada.");

        } catch (error) {
            console.error("getChatHtml: Erro interno do servidor:", error);
            res.status(500).json({ 
                message: "Erro interno do servidor ao carregar chat.",
                messagesHtml: '<p class="error-message">Erro ao carregar mensagens. <button onclick="window.location.reload()">Tentar novamente</button></p>',
                chatHeaderHtml: '<p class="error-message">Erro ao carregar header. <button onclick="window.location.reload()">Tentar novamente</button></p>',
                profileHtml: '<p class="error-message">Erro ao carregar perfil. <button onclick="window.location.reload()">Tentar novamente</button></p>',
                otherUser: null
            });
        }
    }

    // --- API: Definir status de digitação ---
    static async setTypingStatus(req, res) {
        if (!req.session.userid) {
            console.log("setTypingStatus: Usuário não autenticado.");
            return res.status(401).json({ message: "Não autorizado" });
        }
        const chatId = parseInt(req.params.chatId, 10);
        const userId = parseInt(req.session.userid, 10);
        const { isTyping } = req.body;
        console.log(`setTypingStatus: Recebido status ${isTyping} para chat ${chatId} do usuário ${userId}`);

        try {
            // Verifica se o usuário tem acesso ao chat
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
                console.log(`setTypingStatus: Chat ${chatId} não encontrado ou usuário ${userId} sem permissão.`);
                return res.status(404).json({ message: "Chat não encontrado." });
            }
            console.log("setTypingStatus: Chat encontrado.", chat.id);

            // Emitir evento via Socket.IO para o outro usuário
            const io = getIo(); // Obtém a instância do Socket.IO
            if (io) {
                const eventName = isTyping ? "user_typing" : "user_stopped_typing";
                // Emite para a sala do chat, excluindo o remetente
                // É importante que o cliente que está digitando NÃO receba o próprio evento de digitação
                // O cliente já gerencia seu próprio estado de digitação localmente.
                io.to(chatId.toString()).emit(eventName, {
                    userId: userId,
                    chatId: chatId,
                    timestamp: new Date()
                });
                console.log(`setTypingStatus: Evento '${eventName}' emitido para chat ${chatId} por user ${userId}.`);
            } else {
                console.warn("setTypingStatus: Socket.IO não inicializado (io é undefined).");
            }

            res.status(200).json({ success: true });
            console.log("setTypingStatus: Resposta de sucesso enviada.");

        } catch (error) {
            console.error("setTypingStatus: Erro interno do servidor:", error);
            res.status(500).json({ message: "Erro interno do servidor." });
        }
    }

    // --- Configuração do Socket.IO (deve ser chamada no arquivo principal do app) ---
    static setupSocketIO(io) {
        console.log("setupSocketIO: Configurando listeners do Socket.IO.");
        io.on("connection", (socket) => {
            console.log("Socket.IO: Usuário conectado:", socket.id);

            // Entrar em uma sala de chat
            socket.on("join_chat", (chatId) => {
                socket.join(chatId.toString());
                console.log(`Socket.IO: Socket ${socket.id} entrou no chat ${chatId}`);
            });

            // Sair de uma sala de chat
            socket.on("leave_chat", (chatId) => {
                socket.leave(chatId.toString());
                console.log(`Socket.IO: Socket ${socket.id} saiu do chat ${chatId}`);
            });

            // Usuário começou a digitar
            socket.on("typing", (data) => {
                console.log(`Socket.IO: Recebido evento 'typing' de user ${data.userId} para chat ${data.chatId}.`);
                // Emite para a sala do chat, excluindo o remetente
                socket.to(data.chatId.toString()).emit("user_typing", {
                    userId: data.userId,
                    chatId: data.chatId,
                    timestamp: new Date()
                });
                console.log(`Socket.IO: Evento 'user_typing' emitido para sala ${data.chatId} (excluindo remetente).`);
            });

            // Usuário parou de digitar
            socket.on("stopped_typing", (data) => {
                console.log(`Socket.IO: Recebido evento 'stopped_typing' de user ${data.userId} para chat ${data.chatId}.`);
                // Emite para a sala do chat, excluindo o remetente
                socket.to(data.chatId.toString()).emit("user_stopped_typing", {
                    userId: data.userId,
                    chatId: data.chatId,
                    timestamp: new Date()
                });
                console.log(`Socket.IO: Evento 'user_stopped_typing' emitido para sala ${data.chatId} (excluindo remetente).`);
            });

            // Desconexão
            socket.on("disconnect", () => {
                console.log("Socket.IO: Usuário desconectado:", socket.id);
            });
        });
    }
};

