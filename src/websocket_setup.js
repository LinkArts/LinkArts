const { Server } = require("socket.io");

let io;

function initWebSocket(httpServer) {
    console.log("initWebSocket: Iniciando configuração do WebSocket...");
    
    io = new Server(httpServer, {
        cors: {
            origin: "*", // Configure para a origem do seu frontend em produção
            methods: ["GET", "POST"]
        }
    });

    console.log("initWebSocket: Socket.IO Server criado");

    // Configuração básica de eventos - os específicos do chat serão configurados depois
    io.on("connection", (socket) => {
        console.log("Socket.IO: Usuário conectado:", socket.id);

        socket.on("disconnect", () => {
            console.log("Socket.IO: Usuário desconectado:", socket.id);
        });
    });

    console.log("Servidor WebSocket inicializado.");
    return io;
}

function getIo() {
    console.log("getIo: Chamada para getIo(), io existe?", !!io);
    if (!io) {
        const error = new Error("Socket.IO não inicializado!");
        console.error("getIo: Erro -", error.message);
        throw error;
    }
    console.log("getIo: Retornando instância do Socket.IO");
    return io;
}

function setupChatHandlers() {
    if (!io) {
        console.error("setupChatHandlers: Socket.IO não inicializado!");
        return;
    }

    console.log("setupChatHandlers: Configurando handlers do chat...");
    
    io.on("connection", (socket) => {
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
            socket.to(data.chatId.toString()).emit("user_typing", {
                userId: data.userId,
                chatId: data.chatId,
                timestamp: new Date()
            });
            console.log(`Socket.IO: Evento 'user_typing' emitido para sala ${data.chatId} (excluindo remetente).`);
        });

        // Usuário parou de digitar
        socket.on("stop_typing", (data) => {
            console.log(`Socket.IO: Recebido evento 'stop_typing' de user ${data.userId} para chat ${data.chatId}.`);
            socket.to(data.chatId.toString()).emit("user_stopped_typing", {
                userId: data.userId,
                chatId: data.chatId,
                timestamp: new Date()
            });
            console.log(`Socket.IO: Evento 'user_stopped_typing' emitido para sala ${data.chatId} (excluindo remetente).`);
        });

        // Nova mensagem (para compatibilidade)
        socket.on("new_message", (data) => {
            console.log(`Socket.IO: Recebido evento 'new_message' (via socket):`, data);
            socket.to(data.chatId.toString()).emit("new_message", data);
            console.log(`Socket.IO: Evento 'new_message' re-emitido para sala ${data.chatId}.`);
        });
    });

    console.log("setupChatHandlers: Handlers do chat configurados.");
}

module.exports = { initWebSocket, getIo, setupChatHandlers };

