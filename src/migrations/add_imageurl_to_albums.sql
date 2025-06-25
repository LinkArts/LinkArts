-- Adicionar campo imageUrl à tabela Albums
ALTER TABLE "Albums" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT; 