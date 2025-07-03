const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middlewares/checkAuth');
const { upload, uploadToSupabase, deleteFromSupabase } = require('../utils/uploadMiddleware');
const { User, Event, Music, Album } = require('../models');



router.post('/profile/photo', 
    checkAuth,
    upload.single('profilePhoto'),
    uploadToSupabase('profiles'),
    async (req, res) => {
        try {
            if (!req.uploadedFile) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Nenhuma imagem foi enviada' 
                });
            }

            await User.update(
                { imageUrl: req.uploadedFile.url },
                { where: { id: req.session.userid } }
            );

            res.json({
                success: true,
                message: 'Foto de perfil atualizada com sucesso!',
                imageUrl: req.uploadedFile.url,
                data: {
                    url: req.uploadedFile.url,
                    path: req.uploadedFile.path,
                    size: req.uploadedFile.size
                }
            });
        } catch (error) {
            console.error('Erro ao salvar URL de perfil no banco:', error);
            res.status(500).json({ 
                success: false,
                message: 'Erro interno do servidor' 
            });
        }
    }
);

router.post('/event/photo',
    checkAuth,
    upload.single('eventPhoto'),
    uploadToSupabase('events'),
    async (req, res) => {
        try {
            if (!req.uploadedFile) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Nenhuma imagem foi enviada' 
                });
            }

            if (req.body.eventId) {
                const event = await Event.findByPk(req.body.eventId);
                if (event) {
                    await event.update({ imageUrl: req.uploadedFile.url });
                }
            }

            res.json({
                success: true,
                message: 'Imagem do evento enviada com sucesso!',
                imageUrl: req.uploadedFile.url,
                data: {
                    url: req.uploadedFile.url,
                    path: req.uploadedFile.path,
                    size: req.uploadedFile.size
                }
            });
        } catch (error) {
            console.error('Erro no upload de evento:', error);
            res.status(500).json({ 
                success: false,
                message: 'Erro interno do servidor' 
            });
        }
    }
);

router.post('/music/cover',
    checkAuth,
    upload.single('musicCover'),
    uploadToSupabase('music'),
    async (req, res) => {
        try {
            if (!req.uploadedFile) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Nenhuma imagem foi enviada' 
                });
            }

            if (req.body.musicId) {
                const music = await Music.findByPk(req.body.musicId);
                if (music) {
                    await music.update({ image: req.uploadedFile.url });
                }
            }

            res.json({
                success: true,
                message: 'Capa da música enviada com sucesso!',
                imageUrl: req.uploadedFile.url,
                data: {
                    url: req.uploadedFile.url,
                    path: req.uploadedFile.path,
                    size: req.uploadedFile.size
                }
            });
        } catch (error) {
            console.error('Erro no upload de capa:', error);
            res.status(500).json({ 
                success: false,
                message: 'Erro interno do servidor' 
            });
        }
    }
);

router.post('/album/cover',
    checkAuth,
    upload.single('albumCover'),
    uploadToSupabase('music'),
    async (req, res) => {
        try {
            if (!req.uploadedFile) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Nenhuma imagem foi enviada' 
                });
            }

            if (req.body.albumId) {
                const album = await Album.findByPk(req.body.albumId);
                if (album) {
                    await album.update({ imageUrl: req.uploadedFile.url });
                }
            }

            res.json({
                success: true,
                message: 'Capa do álbum enviada com sucesso!',
                imageUrl: req.uploadedFile.url,
                data: {
                    url: req.uploadedFile.url,
                    path: req.uploadedFile.path,
                    size: req.uploadedFile.size
                }
            });
        } catch (error) {
            console.error('Erro no upload de capa de álbum:', error);
            res.status(500).json({ 
                success: false,
                message: 'Erro interno do servidor' 
            });
        }
    }
);

router.delete('/delete/:bucket/:path(*)',
    checkAuth,
    async (req, res) => {
        try {
            const { bucket, path } = req.params;
            
            const success = await deleteFromSupabase(bucket, path);
            
            if (success) {
                res.json({
                    success: true,
                    message: 'Imagem deletada com sucesso!'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao deletar imagem'
                });
            }
        } catch (error) {
            console.error('Erro ao deletar imagem:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
);

router.get('/test', checkAuth, (req, res) => {
    res.json({
        success: true,
        message: 'Sistema de upload funcionando!',
        user: req.session.userid
    });
});

module.exports = router; 