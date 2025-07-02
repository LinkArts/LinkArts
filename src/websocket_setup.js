const { Server } = require("socket.io");

let io;

function initWebSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // Configure para a origem do seu frontend em produção
            methods: ["GET", "POST"]
        }
    });

    // Configuração básica de eventos - os específicos do chat serão configurados depois
    io.on("connection", (socket) => {
        // Evento para usuário se conectar à sua sala de notificações
        socket.on("join_user_room", (userId) => {
            socket.join(`user_${userId}`);
        });

        // Evento para usuário sair da sua sala de notificações
        socket.on("leave_user_room", (userId) => {
            socket.leave(`user_${userId}`);
        });

        socket.on("disconnect", () => {
            // Usuário desconectado
        });
    });

    return io;
}

function getIo() {
    if (!io) {
        const error = new Error("Socket.IO não inicializado!");
        console.error("getIo: Erro -", error.message);
        throw error;
    }
    return io;
}

function setupChatHandlers() {
    if (!io) {
        console.error("setupChatHandlers: Socket.IO não inicializado!");
        return;
    }
    
    io.on("connection", (socket) => {
        // Entrar em uma sala de chat
        socket.on("join_chat", (chatId) => {
            socket.join(chatId.toString());
        });

        // Sair de uma sala de chat
        socket.on("leave_chat", (chatId) => {
            socket.leave(chatId.toString());
        });

        // Usuário começou a digitar
        socket.on("typing", (data) => {
            socket.to(data.chatId.toString()).emit("user_typing", {
                userId: data.userId,
                chatId: data.chatId,
                timestamp: new Date()
            });
        });

        // Usuário parou de digitar
        socket.on("stop_typing", (data) => {
            socket.to(data.chatId.toString()).emit("user_stopped_typing", {
                userId: data.userId,
                chatId: data.chatId,
                timestamp: new Date()
            });
        });

        // Nova mensagem (para compatibilidade)
        socket.on("new_message", (data) => {
            socket.to(data.chatId.toString()).emit("new_message", data);
        });
    });
}

function setupServiceHandlers() {
    if (!io) {
        console.error("setupServiceHandlers: Socket.IO não inicializado!");
        return;
    }
    
    io.on("connection", (socket) => {
        // Entrar em uma sala de serviço
        socket.on("join_service", (serviceId) => {
            socket.join(`service_${serviceId}`);
        });

        // Sair de uma sala de serviço
        socket.on("leave_service", (serviceId) => {
            socket.leave(`service_${serviceId}`);
        });
    });
}

// Função para emitir atualizações de status de serviço
function emitServiceUpdate(serviceId, serviceData) {
    if (!io) {
        console.error("emitServiceUpdate: Socket.IO não inicializado!");
        return;
    }
    
    io.to(`service_${serviceId}`).emit("service_updated", {
        serviceId: serviceId,
        serviceData: serviceData
    });
}

module.exports = { initWebSocket, getIo, setupChatHandlers, setupServiceHandlers, emitServiceUpdate };

