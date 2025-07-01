const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const path = require('path');
const mime = require('mime-types');

// Storage em memória para processar antes de enviar para Supabase
const supabaseStorage = multer.memoryStorage();

const upload = multer({
    storage: supabaseStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Apenas imagens JPEG, PNG e WebP são permitidas!'));
        }
    }
});

// Middleware para processar e enviar imagem para Supabase Storage
const uploadToSupabase = (bucketName, subfolder = '') => {
    return async (req, res, next) => {
        // Tratamento de erros do multer
        if (req.multerError) {
            if (req.multerError.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'Arquivo muito grande. Máximo permitido: 10MB'
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Erro no upload: ' + req.multerError.message
            });
        }

        if (!req.file) {
            return next();
        }

        try {
            // Processar imagem com Sharp
            const processedImage = await sharp(req.file.buffer)
                .resize(1200, 800, { 
                    fit: 'inside', 
                    withoutEnlargement: true 
                })
                .jpeg({ 
                    quality: 85,
                    progressive: true 
                })
                .toBuffer();

            // Gerar nome único para o arquivo
            const fileExtension = '.jpg';
            const fileName = `${Date.now()}_${uuidv4()}${fileExtension}`;
            
            // Definir path baseado no bucket e usuário
            let filePath;
            if (subfolder) {
                filePath = `${subfolder}/${fileName}`;
            } else {
                switch (bucketName) {
                    case 'profiles':
                        filePath = `user_${req.session.userid}/${fileName}`;
                        break;
                    case 'events':
                        filePath = `events/${fileName}`;
                        break;
                    case 'music':
                        filePath = `music/${fileName}`;
                        break;
                    case 'albums':
                        filePath = `albums/${fileName}`;
                        break;
                    default:
                        filePath = fileName;
                }
            }

            // Upload para Supabase Storage
            const { data, error } = await supabase.storage
                .from(bucketName)
                .upload(filePath, processedImage, {
                    contentType: 'image/jpeg',
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Erro no upload Supabase:', error);
                
                // Se o bucket não existe, tentar criar
                if (error.message.includes('Bucket not found')) {
                    const { error: createError } = await supabase.storage.createBucket(bucketName, {
                        public: true,
                        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
                        fileSizeLimit: 10485760 // 10MB
                    });
                    
                    if (!createError) {
                        // Tentar upload novamente
                        const { data: retryData, error: retryError } = await supabase.storage
                            .from(bucketName)
                            .upload(filePath, processedImage, {
                                contentType: 'image/jpeg',
                                cacheControl: '3600',
                                upsert: false
                            });
                            
                        if (retryError) {
                            throw retryError;
                        }
                    }
                } else {
                    throw error;
                }
            }

            // Obter URL pública
            const { data: urlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            // Adicionar informações do arquivo ao req para uso posterior
            req.uploadedFile = {
                path: filePath,
                url: urlData.publicUrl,
                bucket: bucketName,
                size: processedImage.length,
                mimetype: 'image/jpeg',
                originalName: req.file.originalname
            };

            next();
        } catch (error) {
            console.error('Erro no processamento de upload:', error);
            return res.status(500).json({ 
                success: false,
                message: 'Erro ao processar imagem',
                error: error.message 
            });
        }
    };
};

// Middleware para deletar imagem do Supabase
const deleteFromSupabase = async (bucketName, filePath) => {
    try {
        const { error } = await supabase.storage
            .from(bucketName)
            .remove([filePath]);
            
        if (error) {
            console.error('Erro ao deletar arquivo:', error);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Erro ao deletar arquivo:', error);
        return false;
    }
};

module.exports = {
    upload,
    uploadToSupabase,
    deleteFromSupabase
}; 