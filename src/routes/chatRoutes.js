const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator"); // Importar query

const ChatController = require("../controllers/ChatController");
const { checkAuth } = require("../middlewares/checkAuth");

// Middleware para tratar erros de validação
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Retorna apenas a primeira mensagem de erro para simplificar
        return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
};

// --- Rotas Originais (renderização de página, etc.) ---
router.get("/chat/:id", checkAuth, ChatController.showChatPage);
router.post("/chat/create/:id", checkAuth, ChatController.createChat);

// --- Rotas da API JSON para o Chat Funcional ---

// Rota para obter a lista de chats do usuário logado
router.get("/api/chats", checkAuth, ChatController.getChatsApi);

// Rota para obter as mensagens de um chat específico (com validação de paginação)
router.get(
    "/api/chats/:chatId/messages",
    checkAuth,
    [
        param("chatId").isInt({ min: 1 }).withMessage("ID do chat inválido."),
        // Validação para parâmetros de paginação (opcionais)
        query("limit")
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage("O limite deve ser um número entre 1 e 100.")
            .toInt(), // Converte para inteiro
        query("offset")
            .optional()
            .isInt({ min: 0 })
            .withMessage("O offset deve ser um número inteiro não negativo.")
            .toInt(), // Converte para inteiro
    ],
    handleValidationErrors, // Middleware para tratar erros de validação
    ChatController.getChatMessages
);

// Rota para enviar uma nova mensagem para um chat específico
router.post(
    "/api/chats/:chatId/messages",
    checkAuth,
    [
        param("chatId").isInt({ min: 1 }).withMessage("ID do chat inválido."),
        body("message")
            .trim()
            .notEmpty()
            .withMessage("O conteúdo da mensagem não pode estar vazio.")
            .isLength({ max: 5000 })
            .withMessage("A mensagem excede o limite de 5000 caracteres."),
    ],
    handleValidationErrors,
    ChatController.sendMessageApi
);

// Rota para obter HTML dos blocos do chat (mensagens, header, perfil)
router.get(
    "/api/chats/:chatId/html",
    checkAuth,
    ChatController.getChatHtml
);

module.exports = router;

