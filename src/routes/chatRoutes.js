const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator"); // Importar query

const ChatController = require("../controllers/ChatController");
const { checkAuth } = require("../middlewares/checkAuth");

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
};

router.get("/chat/:id", checkAuth, ChatController.showChatPage);
router.post("/chat/create/:id", checkAuth, ChatController.createChat);


router.get("/api/chats", checkAuth, ChatController.getChatsApi);

router.get(
    "/api/chats/:chatId/messages",
    checkAuth,
    [
        param("chatId").isInt({ min: 1 }).withMessage("ID do chat inválido."),
        query("limit")
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage("O limite deve ser um número entre 1 e 100.")
            .toInt(),
        query("offset")
            .optional()
            .isInt({ min: 0 })
            .withMessage("O offset deve ser um número inteiro não negativo.")
            .toInt(),
    ],
    handleValidationErrors,
    ChatController.getChatMessages
);

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

router.get(
    "/api/chats/:chatId/html",
    checkAuth,
    [
        param("chatId").isInt({ min: 1 }).withMessage("ID do chat inválido."),
    ],
    handleValidationErrors,
    ChatController.getChatHtml
);

router.post(
    "/api/chats/:chatId/typing",
    checkAuth,
    [
        param("chatId").isInt({ min: 1 }).withMessage("ID do chat inválido."),
        body("isTyping").isBoolean().withMessage("isTyping deve ser um valor booleano."),
    ],
    handleValidationErrors,
    ChatController.setTypingStatus
);

router.get("/api/chats/navbar", ChatController.getNavbarChatsApi);

module.exports = router;