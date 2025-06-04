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

            const chats = await user.getChats({
                include: [
                    {
                        model: User,
                        through: { attributes: [] }, // Não traz dados da tabela de junção
                        where: {
                            id: { [Op.ne]: userId } // Pega apenas o *outro* usuário no chat
                        },
                        attributes: ['id', 'name'] // Apenas ID e nome do outro usuário
                    },
                    {
                        model: Message,
                        limit: 1,
                        order: [['createdAt', 'DESC']],
                        attributes: ['message', 'createdAt'] // Pega a última mensagem
                    }
                ],
                order: [[Message, 'createdAt', 'DESC']] // Ordena os chats pela última mensagem
            });

            // Formata para o frontend
            const formattedChats = chats.map(chat => {
                const otherUser = chat.Users.length > 0 ? chat.Users[0] : null; // Deve haver apenas um outro usuário devido ao 'where'
                const latestMessage = chat.Messages.length > 0 ? chat.Messages[0] : null;

                return {
                    chatId: chat.id,
                    otherUser: otherUser ? { id: otherUser.id, name: otherUser.name } : null,
                    // Mapeia 'message' para 'content' para compatibilidade com frontend
                    latestMessage: latestMessage ? { content: latestMessage.message, createdAt: latestMessage.createdAt } : null,
                };
            });
            
             // Ordena novamente no JS caso a ordenação do include não seja perfeita
             formattedChats.sort((a, b) => {
                const dateA = a.latestMessage ? new Date(a.latestMessage.createdAt) : new Date(0);
                const dateB = b.latestMessage ? new Date(b.latestMessage.createdAt) : new Date(0);
                return dateB - dateA;
            });

            return res.status(200).json(formattedChats); // Retorna o array diretamente

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
        // Obter parâmetros de paginação da query (já validados e convertidos para int na rota)
        const limit = req.query.limit || 30; // Define um limite padrão (ex: 30 mensagens)
        const offset = req.query.offset || 0; // Define um offset padrão (começa do início)

        try {
            // Verifica se o usuário pertence ao chat
            const chat = await Chat.findOne({
                where: { id: chatId },
                include: [
                    {
                        model: User,
                        where: { id: userId },
                        attributes: [], // Não precisa dos dados do usuário aqui
                        through: { attributes: [] }
                    }
                ]
            });

            if (!chat) {
                return res.status(404).json({ message: 'Chat não encontrado ou você não tem permissão para acessá-lo.' });
            }

            // Busca as mensagens do chat com paginação
            // Usamos findAndCountAll para obter o total e facilitar paginação no frontend
            const { count, rows: messages } = await Message.findAndCountAll({
                where: { ChatId: chatId },
                include: [
                    {
                        model: User, // Inclui o remetente
                        attributes: ['id', 'name'] // Apenas ID e nome do remetente
                    }
                ],
                order: [['createdAt', 'DESC']], // Ordena da mais *nova* para a mais *antiga* para paginação
                limit: limit,
                offset: offset
            });

            // Formata para o frontend
            // Inverte a ordem para exibir da mais antiga para a mais nova no chat
            const formattedMessages = messages.reverse().map(msg => ({
                id: msg.id,
                message: msg.message, // Campo original
                createdAt: msg.createdAt,
                sender: msg.User ? { id: msg.User.id, name: msg.User.name } : null,
            }));

            // Retorna as mensagens paginadas e o total
            return res.status(200).json({ 
                messages: formattedMessages, 
                totalMessages: count, 
                limit: limit, 
                offset: offset 
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
                ChatId: chatId,
                UserId: userId, // Associa ao usuário logado
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
                createdAt: sentMessage.createdAt,
                sender: sentMessage.User ? { id: sentMessage.User.id, name: sentMessage.User.name } : null,
                isCurrentUser: false // Será tratado no cliente
            };

            // *** EMITIR EVENTO WEBSOCKET ***
            try {
                const io = getIo();
                // Emite para a sala específica do chat
                io.to(chatId.toString()).emit('new_message', formattedSentMessage);
                console.log(`Mensagem emitida para a sala ${chatId}`);
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
    static async createChat(req, res){
        // Implementar lógica para criar um novo chat entre dois usuários, se necessário
        console.log("Rota createChat chamada, mas não implementada.");
        res.status(501).send("Funcionalidade de criar chat não implementada.");
    }
}

