-- Migração: Adicionar campo imageUrl à tabela Users
-- Data: $(date +'%Y-%m-%d')
-- Descrição: Adiciona coluna imageUrl para armazenar URLs de imagens de perfil do Supabase Storage

-- Verificar se a coluna já existe antes de adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'linkarts' 
        AND table_name = 'Users' 
        AND column_name = 'imageUrl'
    ) THEN
        ALTER TABLE linkarts."Users" 
        ADD COLUMN "imageUrl" VARCHAR(500) DEFAULT NULL;
        
        RAISE NOTICE 'Coluna imageUrl adicionada com sucesso à tabela Users';
    ELSE
        RAISE NOTICE 'Coluna imageUrl já existe na tabela Users';
    END IF;
END $$; 