-- Adicionar campo price à tabela ServiceRequest
ALTER TABLE ServiceRequests ADD COLUMN price DECIMAL(10, 2) DEFAULT NULL; 