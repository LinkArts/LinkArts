-- Migração para atualizar estruturas de Albums e Music
-- Execute este script para aplicar as mudanças recentes

-- 1. Aumentar limite de caracteres para nome do álbum
ALTER TABLE "Albums" ALTER COLUMN "name" TYPE VARCHAR(50);

-- 2. Atualizar campo de imagem da música para TEXT e permitir NULL
ALTER TABLE "Music" ALTER COLUMN "image" TYPE TEXT;
ALTER TABLE "Music" ALTER COLUMN "image" DROP NOT NULL;

-- 3. Verificar se a tabela de relacionamento AlbumMusic existe, se não criar
CREATE TABLE IF NOT EXISTS "AlbumMusic" (
    "albumid" INTEGER NOT NULL,
    "musicid" INTEGER NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("albumid", "musicid"),
    FOREIGN KEY ("albumid") REFERENCES "Albums"("id") ON DELETE CASCADE,
    FOREIGN KEY ("musicid") REFERENCES "Music"("id") ON DELETE CASCADE
);

-- 4. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS "idx_albums_userid" ON "Albums"("userid");
CREATE INDEX IF NOT EXISTS "idx_music_userid" ON "Music"("userid");
CREATE INDEX IF NOT EXISTS "idx_albummusic_albumid" ON "AlbumMusic"("albumid");
CREATE INDEX IF NOT EXISTS "idx_albummusic_musicid" ON "AlbumMusic"("musicid");

-- 5. Comentários para documentação
COMMENT ON COLUMN "Albums"."name" IS 'Nome do álbum (máximo 50 caracteres)';
COMMENT ON COLUMN "Music"."image" IS 'URL da imagem da música (armazenada no Supabase Storage)';
COMMENT ON TABLE "AlbumMusic" IS 'Tabela de relacionamento many-to-many entre Albums e Music'; 