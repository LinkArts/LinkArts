const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");

const ReportController = require("../controllers/ReportController");
const { checkAuth } = require("../middlewares/checkAuth");

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
};

// Criar nova denúncia
router.post(
    "/api/reports",
    checkAuth,
    [
        body("reason")
            .trim()
            .notEmpty()
            .withMessage("Motivo da denúncia é obrigatório.")
            .isIn(['spam', 'fake', 'harassment', 'inappropriate', 'copyright', 'other'])
            .withMessage("Motivo da denúncia inválido."),
        body("description")
            .optional()
            .trim()
            .isLength({ max: 1000 })
            .withMessage("Descrição deve ter no máximo 1000 caracteres."),
        body("type")
            .optional()
            .isIn(['profile', 'chat'])
            .withMessage("Tipo de denúncia deve ser 'profile' ou 'chat'."),
        body("reportedUserId")
            .optional()
            .isInt({ min: 1 })
            .withMessage("ID do usuário denunciado deve ser um número válido."),
        body("chatId")
            .optional()
            .isInt({ min: 1 })
            .withMessage("ID do chat deve ser um número válido.")
    ],
    handleValidationErrors,
    ReportController.createReport
);

// Listar denúncias do usuário
router.get("/api/reports", checkAuth, ReportController.getReports);

module.exports = router; 