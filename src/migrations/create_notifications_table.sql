-- Criação da tabela de notificações
CREATE TABLE IF NOT EXISTS "Notifications" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('new_proposal', 'new_service_request', 'status_update', 'password_change')),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    reference_id INTEGER,
    reference_type VARCHAR(50),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índices para melhor performance
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES "Users" (id) ON DELETE CASCADE
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON "Notifications" (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON "Notifications" (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON "Notifications" ("createdAt");
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON "Notifications" (user_id, is_read) WHERE is_read = FALSE; 