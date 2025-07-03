const { Server } = require("socket.io");

let io;

function initWebSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        socket.on("join_user_room", (userId) => {
            socket.join(`user_${userId}`);
        });

        socket.on("leave_user_room", (userId) => {
            socket.leave(`user_${userId}`);
        });

        socket.on("disconnect", () => {
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
        socket.on("join_chat", (chatId) => {
            socket.join(chatId.toString());
        });

        socket.on("leave_chat", (chatId) => {
            socket.leave(chatId.toString());
        });

        socket.on("typing", (data) => {
            socket.to(data.chatId.toString()).emit("user_typing", {
                userId: data.userId,
                chatId: data.chatId,
                timestamp: new Date()
            });
        });

        socket.on("stop_typing", (data) => {
            socket.to(data.chatId.toString()).emit("user_stopped_typing", {
                userId: data.userId,
                chatId: data.chatId,
                timestamp: new Date()
            });
        });

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
        socket.on("join_service", (serviceId) => {
            socket.join(`service_${serviceId}`);
        });

        socket.on("leave_service", (serviceId) => {
            socket.leave(`service_${serviceId}`);
        });
    });
}

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

