const { createClient } = require('@supabase/supabase-js');
const Album = require('../models/Album');

const SUPABASE_URL = 'https://dpxlugpuqdztjapjxhpv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function updateAlbumUrls() {
    try {
        console.log('🔄 Iniciando atualização das URLs dos álbuns...');

        // Buscar todos os álbuns
        const albums = await Album.findAll();
        console.log(`📝 Encontrados ${albums.length} álbuns para atualizar`);

        let successCount = 0;
        let errorCount = 0;

        for (const album of albums) {
            try {
                if (!album.imageUrl) {
                    console.log(`⚠️ Album ${album.id} não tem imageUrl`);
                    continue;
                }

                // Extrair o nome do arquivo da URL antiga
                const oldPath = album.imageUrl.split('/').pop();
                if (!oldPath) continue;

                // Gerar URL pública do novo bucket
                const { data: { publicUrl } } = supabase.storage
                    .from('albums')
                    .getPublicUrl(`music/${oldPath}`);

                // Atualizar a URL no banco de dados
                await album.update({ imageUrl: publicUrl });
                
                console.log(`✅ Album ${album.id} atualizado com sucesso`);
                successCount++;

            } catch (error) {
                console.error(`❌ Erro ao atualizar album ${album.id}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n📊 Resumo da Atualização:');
        console.log(`✅ Albums atualizados: ${successCount}`);
        console.log(`❌ Erros: ${errorCount}`);
        console.log(`📋 Total: ${albums.length}`);

    } catch (error) {
        console.error('💥 Erro crítico:', error);
    }
}

if (require.main === module) {
    updateAlbumUrls()
        .then(() => {
            console.log('🎉 Atualização concluída!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Erro fatal:', error);
            process.exit(1);
        });
}

module.exports = { updateAlbumUrls }; 