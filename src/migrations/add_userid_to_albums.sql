-- Migração para adicionar campo userid à tabela Albums
-- Execute este script no banco de dados se a tabela Albums já existir

ALTER TABLE Albums ADD COLUMN userid VARCHAR(255);

-- Criar índice para melhorar performance
CREATE INDEX idx_albums_userid ON Albums(userid);

-- Adicionar constraint de foreign key se necessário
-- ALTER TABLE Albums ADD CONSTRAINT fk_albums_userid 
-- FOREIGN KEY (userid) REFERENCES Artists(cpf) 
-- ON DELETE CASCADE ON UPDATE CASCADE; 