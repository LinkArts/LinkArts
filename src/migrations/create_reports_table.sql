-- Criação da tabela Reports para armazenar denúncias de usuários e conversas
CREATE TABLE IF NOT EXISTS Reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporterUserId INTEGER NOT NULL,
    reportedUserId INTEGER,
    chatId INTEGER,
    type VARCHAR(10) NOT NULL DEFAULT 'profile' CHECK (type IN ('profile', 'chat')),
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporterUserId) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (reportedUserId) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (chatId) REFERENCES Chats(id) ON DELETE CASCADE
); 