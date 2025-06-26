/**
 * Script para migrar fisicamente os arquivos de imagens de álbuns
 * do bucket 'music' para o bucket 'albums'
 * 
 * IMPORTANTE: Este script requer SUPABASE_SERVICE_ROLE_KEY configurada
 */

const { createClient } = require('@supabase/supabase-js');

// Configuração direta para migração (substitua pela sua chave)
const SUPABASE_URL = 'https://dpxlugpuqdztjapjxhpv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'SUA_CHAVE_SERVICE_ROLE_AQUI';

if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY === 'SUA_CHAVE_SERVICE_ROLE_AQUI') {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada!');
    console.log('💡 Configure a variável de ambiente ou edite o script diretamente.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Lista dos arquivos que precisam ser migrados (baseado nos dados do banco)
const filesToMigrate = [
    'music/1750863659533_751d1de7-b439-4181-a794-2289a73f0fde.jpg',
    'music/1750863775117_0bb3d7b6-c246-4032-91be-de2214360f93.jpg',
    'music/1750880172318_52034fb3-03a5-461e-aef7-10e1aa10571b.jpg',
    'music/1750819984599_0c17b7ff-d25b-4714-ab0f-ad2a670deda1.jpg',
    'music/1750957964350_21b1eb13-a6de-435a-bfeb-706a24cd6343.jpg',
    'music/1750863676443_292e31a2-b39f-4c5d-8e21-29c2d2c267b3.jpg',
    'music/1750955610939_76b46e5f-5c1a-437a-aec3-3d4c3ef3931b.jpg',
    'music/1750955894933_93b098fa-e34b-4dca-a9e1-91b207ae8b52.jpg',
    'music/1750958459446_2eb668c4-da38-4192-803e-11585977ee8f.jpg',
    'music/1750958469278_932b058d-96f4-4b8d-b83d-7b7bc7fd6a42.jpg'
];

async function migrateFiles() {
    console.log('🚀 Iniciando migração física dos arquivos de álbuns...');
    
    try {
        // 1. Criar bucket 'albums' se não existir
        console.log('📦 Criando bucket "albums"...');
        const { error: createBucketError } = await supabase.storage.createBucket('albums', {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
            fileSizeLimit: 10485760 // 10MB
        });
        
        if (createBucketError && !createBucketError.message.includes('already exists')) {
            console.error('❌ Erro ao criar bucket:', createBucketError);
            return;
        }
        console.log('✅ Bucket "albums" pronto');

        let successCount = 0;
        let errorCount = 0;

        // 2. Migrar cada arquivo
        for (const filePath of filesToMigrate) {
            try {
                console.log(`🔄 Migrando: ${filePath}`);
                
                // Baixar do bucket 'music'
                const { data: fileData, error: downloadError } = await supabase.storage
                    .from('music')
                    .download(filePath);

                if (downloadError) {
                    console.error(`❌ Erro ao baixar ${filePath}:`, downloadError.message);
                    errorCount++;
                    continue;
                }

                // Upload para bucket 'albums'
                const { error: uploadError } = await supabase.storage
                    .from('albums')
                    .upload(filePath, fileData, {
                        contentType: 'image/jpeg',
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) {
                    console.error(`❌ Erro ao fazer upload ${filePath}:`, uploadError.message);
                    errorCount++;
                    continue;
                }

                console.log(`✅ Migrado com sucesso: ${filePath}`);
                successCount++;

                // Pausa para evitar rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (error) {
                console.error(`❌ Erro ao processar ${filePath}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n📊 Resumo da Migração:');
        console.log(`✅ Arquivos migrados: ${successCount}`);
        console.log(`❌ Erros: ${errorCount}`);
        console.log(`📋 Total: ${filesToMigrate.length}`);

    } catch (error) {
        console.error('💥 Erro crítico:', error);
    }
}

async function verifyMigration() {
    console.log('\n🔍 Verificando migração...');
    
    let verifiedCount = 0;
    let missingCount = 0;

    for (const filePath of filesToMigrate) {
        try {
            const { data, error } = await supabase.storage
                .from('albums')
                .download(filePath);

            if (error) {
                console.log(`❌ Arquivo não encontrado no destino: ${filePath}`);
                missingCount++;
            } else {
                console.log(`✅ Verificado: ${filePath}`);
                verifiedCount++;
            }
        } catch (error) {
            console.log(`❌ Erro ao verificar: ${filePath}`);
            missingCount++;
        }
    }

    console.log('\n📊 Verificação:');
    console.log(`✅ Arquivos verificados: ${verifiedCount}`);
    console.log(`❌ Arquivos em falta: ${missingCount}`);
}

async function main() {
    await migrateFiles();
    await verifyMigration();
    
    console.log('\n🎉 Migração concluída!');
    console.log('💡 As imagens de álbuns agora estão no bucket separado "albums".');
    console.log('📱 Teste fazendo upload de uma nova capa de álbum para verificar.');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { migrateFiles, verifyMigration }; 