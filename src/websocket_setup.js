const { Server } = require("socket.io");

let io;

function initWebSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // Configure para a origem do seu frontend em produção
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("Um usuário conectou:", socket.id);

        // Evento para entrar em uma sala de chat específica
        socket.on("join_chat", (chatId) => {
            console.log(`Usuário ${socket.id} entrando na sala ${chatId}`);
            socket.join(chatId.toString()); // Garante que chatId seja string
        });

        // Evento para sair de uma sala (opcional, mas boa prática)
        socket.on("leave_chat", (chatId) => {
            console.log(`Usuário ${socket.id} saindo da sala ${chatId}`);
            socket.leave(chatId.toString());
        });

        socket.on("disconnect", () => {
            console.log("Usuário desconectou:", socket.id);
            // Lógica adicional de desconexão, se necessário
        });
    });

    console.log("Servidor WebSocket inicializado.");
    return io;
}

function getIo() {
    if (!io) {
        throw new Error("Socket.IO não inicializado!");
    }
    return io;
}

module.exports = { initWebSocket, getIo };

