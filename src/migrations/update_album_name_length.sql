-- Migração para aumentar o limite de caracteres do campo name na tabela Albums
-- De 20 para 50 caracteres

ALTER TABLE "Albums" 
ALTER COLUMN "name" TYPE VARCHAR(50); 