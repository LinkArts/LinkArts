const { Op, Model, fn, col, where } = require('sequelize');
const sequelize = require('../db/conn');

const { User, Artist, Establishment, Album, Music, Tag, Event, ServiceRequest, Favorite, Rating } = require('../models/index');
const NotificationHelper = require('../utils/notificationHelper');

module.exports = class ProfileController
{
    static async showProfile(req, res)
    {
        const { id } = req.params

        try
        {
            const user = await User.findOne(
                {
                    where: { id: id },
                    include: [
                        {
                            model: Artist,
                            required: false,
                            include: [
                                { model: Music, as: 'Musics', required: false, include: [{ model: Tag, as: 'Tags', required: false }] },
                                { model: Album, required: false }
                            ],

                        },
                        {
                            model: Establishment,
                            required: false,
                            include: [
                                { model: ServiceRequest, as: 'ServiceRequests', required: false, include: [{ model: Tag, as: 'Tags', required: false }] },
                                { model: Event, required: false }
                            ],

                        },
                        {
                            model: Tag,
                            as: 'Tags',
                            required: false
                        }
                    ],
                    exclude: ['password'],
                })

            if (!user)
            {
                req.flash('message', 'Não há um usuário com esse ID!')
                req.flash('messageType', 'notification')

                return req.session.save(() =>
                {
                    if (!req.session.userid)
                        res.redirect('/login')
                    else
                        res.redirect('/dashboard')
                })
            }

            if (user.Artist) {
                user.Artist.Musics = (user.Artist.Musics || []).sort(
                    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
                );
                user.Artist.Albums = (user.Artist.Albums || []).sort(
                    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
                );
            }

            const musicsTags = user.Artist?.Musics?.map(music => ({
                ...music.dataValues,
                tags: music.Tags?.map(tag => tag.dataValues) || []
            }));

            const isOwner = user.dataValues.id === req.session.userid

            let isFavorite = false;
            if (req.session.userid && !isOwner)
            {
                const favorite = await Favorite.findOne({
                    where: {
                        userid: req.session.userid,
                        favoriteid: id
                    }
                });
                isFavorite = !!favorite;
            }

            const totalRatings = await Rating.count({ where: { receiverUserid: id } });
            const averageRating = await Rating.findOne({
                where: { receiverUserid: id },
                attributes: [[fn('AVG', col('rate')), 'averageRating']]
            });
            const averageRatingValue = averageRating && averageRating.dataValues.averageRating
                ? parseFloat(averageRating.dataValues.averageRating).toFixed(1)
                : '0.0';

            const recentReviews = await Rating.findAll({
                where: { receiverUserid: id },
                include: [
                    {
                        model: User,
                        as: 'Sender',
                        attributes: ['id', 'name', 'imageUrl']
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit: 4
            });

            const reviewsData = recentReviews.map(review => ({
                id: review.id,
                rating: review.rate,
                description: review.description,
                senderName: review.Sender.name,
                senderId: review.Sender.id,
                senderImageUrl: review.Sender.imageUrl,
                createdAt: review.createdAt
            }));

            if (user.Establishment)
            {
                const eventsToShow = user.toJSON().Establishment.Events;

                const values = {
                    ...user.dataValues,
                    ...user.Establishment.dataValues,
                    events: eventsToShow,
                    serviceRequests: user.toJSON().Establishment.ServiceRequests,
                    imageUrl: user.imageUrl,
                    tags: user.Tags?.map(tag => tag.dataValues) || [],
                    totalRatings: totalRatings,
                    averageRating: averageRatingValue,
                    reviews: reviewsData
                }
                return res.render('app/profileEstablishment', { values, isOwner, isFavorite, css: 'perfilEstabelecimento.css' })
            }
            else if (user.Artist)
            {
                const values = {
                    ...user.dataValues,
                    ...user.Artist.dataValues,
                    musics: musicsTags,
                    albums: user.Artist?.Albums?.map(album => ({
                        ...album.dataValues,
                        imageUrl: album.imageUrl || '/img/default-album.png'
                    })) || [],
                    imageUrl: user.imageUrl,
                    tags: user.Tags?.map(tag => tag.dataValues) || [],
                    totalRatings: totalRatings,
                    averageRating: averageRatingValue,
                    reviews: reviewsData
                }

                return res.render('app/profileArtist', { values, isOwner, isFavorite, css: 'perfilArtista.css' })
            }
            else
            {
                req.flash('message', 'Ocorreu um erro!')
                req.flash('messageType', 'error')

                return req.session.save(() =>
                {
                    if (!req.session.userid)
                        res.redirect('/login')
                    else
                        res.redirect('/dashboard')
                })
            }
        }
        catch (err)
        {
            console.log(err)

            req.flash('message', 'Algo deu errado!')
            req.flash('messageType', 'error')
            return req.session.save(() =>
            {
                res.redirect('/login')
            })
        }
    }

    static async createAlbum(req, res)
    {
        const { albumName, imageUrl } = req.body

        if (!albumName || albumName.trim().length === 0)
        {
            return res.status(400).json({ message: "Nome do álbum é obrigatório!" })
        }

        if (albumName.length > 50)
        {
            return res.status(400).json({
                message: "Nome do álbum muito longo! Máximo permitido: 50 caracteres."
            })
        }

        try
        {
            const album = await Album.findOne({ where: { name: albumName } })
            const user = await User.findOne({ where: { id: req.session.userid }, include: [{ model: Artist }] })

            if (!user)
            {
                return res.status(404).json({ message: "Usuário não encontrado!" })
            }

            if (!user.Artist)
            {
                return res.status(400).json({ message: "Usuário não é um artista!" })
            }

            if (album)
            {
                return res.json({ message: "Album ja existente!!" })
            }

            const result = await Album.create({
                name: albumName,
                userid: user.Artist.cpf,
                imageUrl: imageUrl || null
            })

            return res.json({ id: result.dataValues.id, message: `O album ${ albumName } foi criado com sucesso!!!` })
        }
        catch (err)
        {
            console.error("Erro ao criar álbum:", err)

            if (err.name === 'SequelizeDatabaseError' && err.original && err.original.code === '22001')
            {
                return res.status(400).json({
                    message: "Nome do álbum muito longo! Máximo permitido: 50 caracteres."
                })
            }

            if (err.name === 'SequelizeValidationError')
            {
                return res.status(400).json({
                    message: "Dados inválidos para criar o álbum!"
                })
            }

            return res.status(500).json({ message: "Erro ao criar álbum!", error: err.message })
        }
    }

    static async updateAlbumCover(req, res)
    {
        const { albumId, imageUrl } = req.body

        try
        {
            const album = await Album.findByPk(albumId)

            if (!album)
            {
                return res.status(404).json({ message: "Álbum não encontrado!" })
            }

            await album.update({ imageUrl })

            return res.json({ message: "Capa do álbum atualizada com sucesso!" })
        }
        catch (err)
        {
            console.log(err)
            return res.status(500).json({ message: "Erro ao atualizar capa do álbum!" })
        }
    }

    static async updateAlbumName(req, res)
    {
        const { albumId, name } = req.body

        if (!name || name.trim().length === 0)
        {
            return res.status(400).json({ message: "Nome do álbum é obrigatório!" })
        }

        if (name.length > 50)
        {
            return res.status(400).json({
                message: "Nome do álbum muito longo! Máximo permitido: 50 caracteres."
            })
        }

        try
        {
            if (!req.session.userid)
            {
                return res.status(401).json({ message: "Usuário não autenticado!" })
            }

            const album = await Album.findByPk(albumId)

            if (!album)
            {
                return res.status(404).json({ message: "Álbum não encontrado!" })
            }

            const user = await User.findOne({
                where: { id: req.session.userid },
                include: [{ model: Artist }]
            })

            if (!user || !user.Artist)
            {
                return res.status(403).json({ message: "Usuário não é um artista!" })
            }

            if (album.userid !== user.Artist.cpf)
            {
                return res.status(403).json({ message: "Você não tem permissão para editar este álbum!" })
            }

            const existingAlbum = await Album.findOne({
                where: {
                    name: name,
                    userid: user.Artist.cpf,
                    id: { [Op.ne]: albumId }
                }
            })

            if (existingAlbum)
            {
                return res.status(400).json({ message: "Já existe um álbum com este nome!" })
            }

            await album.update({ name })

            return res.json({ message: "Nome do álbum atualizado com sucesso!" })
        }
        catch (err)
        {
            console.error("Erro ao atualizar nome do álbum:", err)

            if (err.name === 'SequelizeDatabaseError' && err.original && err.original.code === '22001')
            {
                return res.status(400).json({
                    message: "Nome do álbum muito longo! Máximo permitido: 50 caracteres."
                })
            }

            if (err.name === 'SequelizeValidationError')
            {
                return res.status(400).json({
                    message: "Dados inválidos para atualizar o álbum!"
                })
            }

            return res.status(500).json({ message: "Erro ao atualizar nome do álbum!", error: err.message })
        }
    }

    static async updateMusicCover(req, res)
    {
        const { musicId, imageUrl } = req.body

        try
        {
            const music = await Music.findByPk(musicId)

            if (!music)
            {
                return res.status(404).json({ message: "Música não encontrada!" })
            }

            const user = await User.findOne({
                where: { id: req.session.userid },
                include: [{ model: Artist }]
            })

            if (!user || !user.Artist)
            {
                return res.status(403).json({ message: "Usuário não é um artista!" })
            }

            await music.update({ image: imageUrl })

            return res.json({ message: "Capa da música atualizada com sucesso!" })
        }
        catch (err)
        {
            console.log(err)
            return res.status(500).json({ message: "Erro ao atualizar capa da música!" })
        }
    }

    static async deleteAlbum(req, res)
    {
        const { id } = req.params

        try
        {
            const album = await Album.findByPk(id)

            if (!album)
            {
                return res.status(404).json({
                    success: false,
                    message: "Álbum não encontrado!"
                })
            }

            const userFromSession = await User.findOne({
                where: { id: req.session.userid },
                include: [{ model: Artist }]
            })

            if (!userFromSession || !userFromSession.Artist)
            {
                return res.status(403).json({
                    success: false,
                    message: "Usuário não é um artista!"
                })
            }

            if (album.userid !== userFromSession.Artist.cpf)
            {
                return res.status(403).json({
                    success: false,
                    message: "Você não tem permissão para excluir este álbum!"
                })
            }

            const albumWithMusics = await Album.findOne({
                where: { id: id },
                include: [{ 
                    model: Music, 
                    as: 'Musics',
                    required: false 
                }]
            })

            const musicCount = albumWithMusics && albumWithMusics.Musics ? albumWithMusics.Musics.length : 0

            if (musicCount > 0) {
                await albumWithMusics.setMusics([]);
            }

            await album.destroy()

            return res.json({
                success: true,
                message: "Album deletado com sucesso!!"
            })
        }
        catch (err)
        {
            console.error("Erro ao excluir álbum:", err)
            return res.status(500).json({
                success: false,
                message: "Erro interno do servidor ao excluir álbum!",
                error: err.message
            })
        }
    }

    static async searchAlbum(req, res)
    {
        const { name } = req.params
        const decodedName = decodeURIComponent(name)

        try
        {
            const user = await User.findOne({
                where: {
                    id: req.session.userid,
                },
                include: [{
                    model: Artist,
                    include: [{
                        model: Album,
                        where: {
                            name: { [Op.iLike]: decodedName }
                        },
                        required: false
                    }]
                }]
            })

            if (!user || !user.Artist)
            {
                return res.json({ albumExists: false })
            }

            if (user.Artist.Albums && user.Artist.Albums.length > 0)
            {
                return res.json({ albumExists: true })
            }

            return res.json({ albumExists: false })
        }
        catch (error)
        {
            console.log(error)
            return res.json({ albumExists: false, message: "ERRO!!!" })
        }
    }

    static async getAlbums(req, res)
    {
        try
        {
            const user = await User.findOne({
                where: { id: req.session.userid },
                include: [{
                    model: Artist,
                    include: [{ model: Album }],
                    required: false
                }]
            })

            if (!user || !user.Artist)
            {
                return res.json({ albums: [] })
            }

            const data = user.get({ plain: true })

            return res.json({ albums: data.Artist.Albums || [] })
        }
        catch (err)
        {
            console.log(err)
            return res.json({ albums: [], message: "ERRO!!!!!" })
        }
    }

    static async searchAlbumMusics(req, res)
    {
        const { id } = req.params;

        try
        {
            const album = await Album.findOne({
                where: {
                    id: id
                },
                include: [{
                    model: Music,
                    as: 'Musics',
                    required: false,
                    include: [{
                        model: Tag,
                        as: 'Tags',
                        required: false
                    }]
                }]
            });

            if (!album)
            {
                return res.json({ message: "Album não encontrado!" });
            }

            const data = album.get({ plain: true });

            return res.json({ data });
        }
        catch (error)
        {
            console.log(error);
            return res.json({ message: "ERRO!!!" });
        }
    }

    static async searchMusic(req, res)
    {
        const { id } = req.params

        try
        {
            const music = await Music.findOne({
                where: {
                    id: id
                },
                include: [
                    {
                        model: Album,
                        as: 'Albums',
                        required: false
                    },
                    {
                        model: Tag,
                        as: 'Tags',
                        required: false
                    }
                ]
            })

            const data = music.get({ plain: true })
            return res.json({ data })
        }
        catch (error)
        {
            console.log(error)
            return res.json({ message: "ERRO!!!" })
        }
    }

    static async updateMusic(req, res)
    {
        const { id } = req.params
        const { title, tags, albums, imageUrl, link } = req.body

        if (!title || title.trim().length === 0)
        {
            return res.status(400).json({ message: "Título da música é obrigatório!" })
        }

        if (title.length > 40)
        {
            return res.status(400).json({
                message: "Título da música muito longo! Máximo permitido: 40 caracteres."
            })
        }

        try
        {
            const music = await Music.findOne({
                where: {
                    id: id
                },
                include: [
                    {
                        model: Album,
                        as: 'Albums',
                        required: false
                    },
                    {
                        model: Tag,
                        as: 'Tags',
                        required: false
                    }
                ]
            })

            if (!music)
            {
                return res.status(404).json({ message: "Música não encontrada!" })
            }

            const updatedMusic = await music.update({
                name: title,
                image: imageUrl !== undefined ? imageUrl : music.image,
                link: link !== undefined ? link : music.link,
            })

            if (albums && albums.length > 0)
            {
                const validAlbums = await Album.findAll({
                    where: {
                        name: albums
                    }
                });

                await updatedMusic.setAlbums(validAlbums.map(album => album.id));
            } else
            {
                await updatedMusic.setAlbums([]);
            }

            if (tags && tags.length > 0)
            {
                await updatedMusic.setTags([]);
                await updatedMusic.setTags(tags.map(Number));
            } else
            {
                await updatedMusic.setTags([]);
            }

            return res.json({ message: `A música ${ title } foi atualizada com sucesso!` })
        }
        catch (error)
        {
            console.error("Erro ao atualizar música:", error)

            if (error.name === 'SequelizeDatabaseError' && error.original && error.original.code === '22001')
            {
                return res.status(400).json({
                    message: "Título da música muito longo! Máximo permitido: 40 caracteres."
                })
            }

            if (error.name === 'SequelizeValidationError')
            {
                return res.status(400).json({
                    message: "Dados inválidos para atualizar a música!"
                })
            }

            return res.status(500).json({ message: "Erro ao atualizar música!", error: error.message })
        }

    }

    static async createMusic(req, res)
    {
        const { title, tag, albums, imageUrl, link } = req.body

        if (!title || title.trim().length === 0)
        {
            return res.status(400).json({ message: "Título da música é obrigatório!" })
        }

        if (title.length > 40)
        {
            return res.status(400).json({
                message: "Título da música muito longo! Máximo permitido: 40 caracteres."
            })
        }

        const user = await User.findOne({
            where: {
                id: req.session.userid,
            },
            include: [{
                model: Artist
            }]
        })

        if (!user)
        {
            return res.status(404).json({ message: "Usuário não encontrado!" })
        }

        if (!user.Artist)
        {
            return res.status(400).json({ message: "Usuário não é um artista!" })
        }

        try
        {
            const savedMusic = await Music.create({
                name: title,
                description: null,
                image: imageUrl || null,
                link: link || null,
                genreid: null,
                userid: user.Artist.cpf
            })

            if (tag && tag.length > 0)
            {
                await savedMusic.addTags(tag.map(Number))
            }

            if (albums && albums.length > 0)
            {
                const selectedAlbums = await Album.findAll({
                    where: {
                        name: albums,
                        userid: user.Artist.cpf
                    }
                });

                if (selectedAlbums.length > 0)
                {
                    await savedMusic.setAlbums(selectedAlbums.map(album => album.id));
                }
            }

            return res.json({ message: `A música ${ title } foi criada com sucesso!`, songid: savedMusic.id })
        }
        catch (error)
        {
            console.error("Erro ao criar música:", error)

            if (error.name === 'SequelizeDatabaseError' && error.original && error.original.code === '22001')
            {
                return res.status(400).json({
                    message: "Título da música muito longo! Máximo permitido: 40 caracteres."
                })
            }

            if (error.name === 'SequelizeValidationError')
            {
                return res.status(400).json({
                    message: "Dados inválidos para criar a música!"
                })
            }

            return res.status(500).json({ message: "Erro ao criar música!", error: error.message })
        }
    }

    static async deleteMusic(req, res)
    {
        const { id } = req.params

        try
        {
            const music = await Music.findByPk(id)

            if (!music)
            {
                return res.json({ message: "Música não encontrada!" })
            }

            await music.destroy()
            return res.json({ message: "Música deletada com sucesso!" })
        }
        catch (error)
        {
            console.log(error)
            return res.json({ message: "ERRO!!!" })
        }
    }

    static async getTags(req, res)
    {
        try
        {
            const tags = await Tag.findAll({ raw: true });

            return res.json({ tags })
        }
        catch (error)
        {
            console.log(error)
            return res.json({ message: "ERRO!!!" })
        }
    }

    static async updateProfile(req, res)
    {
        const id = req.session.userid
        const { name, city, description, linkedin, instagram, facebook, tags } = req.body

        if (!name || name.trim().length === 0)
        {
            return res.status(400).json({ message: "Nome do perfil é obrigatório!" })
        }

        if (name.length > 100)
        {
            return res.status(400).json({
                message: "Nome do perfil muito longo! Máximo permitido: 100 caracteres."
            })
        }

        if (city && city.length > 30)
        {
            return res.status(400).json({
                message: "Nome da cidade muito longo! Máximo permitido: 30 caracteres."
            })
        }

        if (description && description.length > 500)
        {
            return res.status(400).json({
                message: "Descrição muito longa! Máximo permitido: 500 caracteres."
            })
        }

        try
        {
            const user = await User.findByPk(id)

            if (!user)
            {
                return res.status(404).json({ message: "Usuário não encontrado!" })
            }

            const updatedUser = await user.update({
                name: name,
                city: city,
                description: description,
                instagram: instagram,
                facebook: facebook,
                linkedin: linkedin
            })

            if (tags !== undefined)
            {
                if (tags && tags.length > 0)
                {
                    await user.setTags(tags.map(Number));
                } else
                {
                    await user.setTags([]);
                }
            }

            return res.json({ message: `O perfil foi atualizado com sucesso!`, user: user })
        }
        catch (error)
        {
            console.error("Erro ao atualizar perfil:", error)

            if (error.name === 'SequelizeDatabaseError' && error.original && error.original.code === '22001')
            {
                return res.status(400).json({
                    message: "Dados muito longos! Verifique os limites de caracteres dos campos."
                })
            }

            if (error.name === 'SequelizeValidationError')
            {
                return res.status(400).json({
                    message: "Dados inválidos para atualizar o perfil!"
                })
            }

            return res.status(500).json({ message: "Erro ao atualizar perfil!", error: error.message })
        }
    }

    static async getAllEvents(req, res)
    {
        try
        {
            const user = await User.findOne({
                where: { id: req.session.userid },
                include: { model: Establishment }
            })

            if (!user || !user.Establishment)
            {
                return res.status(200).json([])
            }

            const establishmentid = user.Establishment.dataValues.cnpj

            const events = await Event.findAll({
                where: { establishmentid: establishmentid },
                order: [['date', 'DESC'], ['id', 'DESC']]
            })
            return res.status(200).json(events)
        } catch (error)
        {
            console.error("Erro ao buscar eventos:", error)
            return res.status(500).json({ message: "Erro ao buscar eventos.", error: error.message })
        }
    }

    static async createEvent(req, res)
    {
        const { title, date, description, imageUrl } = req.body

        if (!title || !date)
        {
            return res.status(400).json({ message: "Título e data são obrigatórios." })
        }

        const user = await User.findOne({ where: { id: req.session.userid }, include: { model: Establishment } })

        if (!user || !user.Establishment)
        {
            return res.status(400).json({ message: "Usuário não é um estabelecimento." })
        }

        const establishmentid = user.Establishment.dataValues.cnpj

        try
        {
            const establishment = await Establishment.findByPk(establishmentid)
            if (!establishment)
            {
                return res.status(404).json({ message: "Estabelecimento não encontrado." })
            }

            const eventData = {
                title,
                date,
                description,
                imageUrl,
                establishmentid
            };

            const newEvent = await Event.create(eventData)

            return res.status(201).json(newEvent)
        } catch (error)
        {
            console.error("💥 [CONTROLLER DEBUG] Erro ao criar evento:", error)
            return res.status(500).json({ message: "Erro ao criar evento.", error: error.message })
        }
    }

    static async updateEvent(req, res)
    {
        const id = req.params.id
        const { title, date, description, imageUrl } = req.body

        if (!title || !date)
        {
            return res.status(400).json({ message: "Título e data são obrigatórios." })
        }

        const user = await User.findOne({ where: { id: req.session.userid }, include: { model: Establishment } })

        if (!user || !user.Establishment)
        {
            return res.status(400).json({ message: "Usuário não é um estabelecimento." })
        }

        const establishmentid = user.Establishment.dataValues.cnpj

        try
        {
            const event = await Event.findByPk(id)
            if (!event)
            {
                return res.status(404).json({ message: "Evento não encontrado." })
            }

            if (establishmentid && event.establishmentid !== establishmentid)
            {
                const newEstablishment = await Establishment.findByPk(establishmentid);
                if (!newEstablishment)
                {
                    return res.status(404).json({ message: "Novo estabelecimento não encontrado." });
                }
            }

            await Event.update(
                { title, date, description, imageUrl, establishmentid },
                { where: { id: id } }
            )
            const updatedEvent = await Event.findByPk(id)
            return res.status(200).json(updatedEvent)
        } catch (error)
        {
            console.error("Erro ao atualizar evento:", error)
            return res.status(500).json({ message: "Erro ao atualizar evento.", error: error.message })
        }
    }

    static async deleteEvent(req, res)
    {
        const id = req.params.id
        try
        {
            const deleted = await Event.destroy({ where: { id: id } })
            if (deleted === 0)
            {
                return res.status(404).json({ message: "Evento não encontrado." })
            }
            return res.status(200).json({ message: "Evento excluído com sucesso." })
        } catch (error)
        {
            console.error("Erro ao deletar evento:", error)
            return res.status(500).json({ message: "Erro ao deletar evento.", error: error.message })
        }
    }


    static async getAllServiceRequests(req, res)
    {
        try
        {
            const user = await User.findOne({
                where: { id: req.session.userid },
                include: { model: Establishment }
            })

            if (!user || !user.Establishment)
            {
                return res.status(200).json([])
            }

            const establishmentid = user.Establishment.dataValues.cnpj

            const requests = await ServiceRequest.findAll({
                where: { establishmentid: establishmentid },
                include: {
                    model: Tag,
                    as: 'Tags',
                    through: { attributes: [] }
                },
                order: [['date', 'ASC'], ['startTime', 'ASC'], ['id', 'ASC']]
            })

            return res.status(200).json(requests)
        } catch (error)
        {
            console.error("Erro ao buscar pedidos de serviço:", error)
            return res.status(500).json({ message: "Erro ao buscar pedidos de serviço.", error: error.message })
        }
    }

    static async createServiceRequest(req, res)
    {
        const { name, description, date, startTime, endTime, tags, price } = req.body

        if (!name || !date || !startTime)
        {
            return res.status(400).json({ message: "Nome, data e hora de início são obrigatórios." })
        }

        const user = await User.findOne({ where: { id: req.session.userid }, include: { model: Establishment } })

        if (!user || !user.Establishment)
        {
            return res.status(400).json({ message: "Usuário não é um estabelecimento." })
        }

        const establishmentid = user.Establishment.dataValues.cnpj

        try
        {
            const establishment = await Establishment.findByPk(establishmentid)
            if (!establishment)
            {
                return res.status(404).json({ message: "Estabelecimento não encontrado." })
            }

            const newServiceRequest = await ServiceRequest.create({
                name,
                description,
                date,
                startTime,
                endTime,
                price,
                tags: tags || [],
                establishmentid
            })

            if (tags && tags.length > 0)
            {
                const tagInstances = await Promise.all(tags.map(async (tagName) =>
                {
                    const [tag] = await Tag.findOrCreate({ where: { id: tagName.trim() } });
                    return tag;
                }));
                await newServiceRequest.addTags(tagInstances);
            }

            const createdServiceRequestWithTags = await ServiceRequest.findByPk(newServiceRequest.id, {
                include: {
                    model: Tag,
                    as: 'Tags',
                    through: { attributes: [] }
                }
            });

            return res.status(201).json(createdServiceRequestWithTags)
        } catch (error)
        {
            console.error("Erro ao criar pedido de serviço:", error)
            return res.status(500).json({ message: "Erro ao criar pedido de serviço.", error: error.message })
        }
    }

    static async updateServiceRequest(req, res)
    {
        const id = req.params.id
        const { name, description, date, startTime, endTime, tags, price } = req.body

        if (!name || !date || !startTime)
        {
            return res.status(400).json({ message: "Nome, data e hora de início são obrigatórios." })
        }

        const user = await User.findOne({ where: { id: req.session.userid }, include: { model: Establishment } })

        if (!user || !user.Establishment)
        {
            return res.status(400).json({ message: "Usuário não é um estabelecimento." })
        }

        const establishmentid = user.Establishment.dataValues.cnpj

        try
        {
            const serviceRequest = await ServiceRequest.findByPk(id)
            if (!serviceRequest)
            {
                return res.status(404).json({ message: "Pedido de serviço não encontrado." })
            }

            if (establishmentid && serviceRequest.establishmentid !== establishmentid)
            {
                const newEstablishment = await Establishment.findByPk(establishmentid);
                if (!newEstablishment)
                {
                    return res.status(404).json({ message: "Novo estabelecimento não encontrado." });
                }
            }

            await ServiceRequest.update(
                { name, description, date, startTime, endTime, price, tags: tags || [], establishmentid },
                { where: { id: id } }
            )

            if (tags && tags.length > 0)
            {
                const tagInstances = await Promise.all(tags.map(async (tagName) =>
                {
                    const [tag] = await Tag.findOrCreate({ where: { id: tagName.trim() } });
                    return tag;
                }));
                await serviceRequest.setTags(tagInstances);
            } else
            {
                await serviceRequest.setTags([]);
            }

            const updatedServiceRequest = await ServiceRequest.findByPk(id, {
                include: {
                    model: Tag,
                    as: 'Tags',
                    through: { attributes: [] }
                }
            })
            return res.status(200).json(updatedServiceRequest)
        } catch (error)
        {
            console.error("Erro ao atualizar pedido de serviço:", error)
            return res.status(500).json({ message: "Erro ao atualizar pedido de serviço.", error: error.message })
        }
    }

    static async deleteServiceRequest(req, res)
    {
        const id = req.params.id
        try
        {
            const deleted = await ServiceRequest.destroy({ where: { id: id } })
            if (deleted === 0)
            {
                return res.status(404).json({ message: "Pedido de serviço não encontrado." })
            }
            return res.status(200).json({ message: "Pedido de serviço excluído com sucesso." })
        } catch (error)
        {
            console.error("Erro ao deletar pedido de serviço:", error)
            return res.status(500).json({ message: "Erro ao deletar pedido de serviço.", error: error.message })
        }
    }

    static async getUserData(req, res)
    {
        const id = req.session.userid;

        try
        {
            const user = await User.findOne({
                where: { id: id },
                include: [
                    { model: Artist, required: false },
                    { model: Tag, as: 'Tags', required: false }
                ],
                attributes: { exclude: ['password'] }
            });

            if (!user)
            {
                return res.status(404).json({ message: "Usuário não encontrado!" });
            }

            const userData = {
                name: user.name,
                city: user.city,
                description: user.description,
                linkedin: user.linkedin,
                instagram: user.instagram,
                facebook: user.facebook,
                imageUrl: user.imageUrl,
                tags: user.Tags ? user.Tags.map(tag => ({ id: tag.id, name: tag.name })) : []
            };

            return res.json({ userData });
        } catch (error)
        {
            console.error("Erro ao buscar dados do usuário:", error);
            return res.status(500).json({ message: "Erro ao buscar dados do usuário." });
        }
    }

    static async searchFavorites(req, res)
    {
        const userid = req.session.userid;

        try
        {
            const user = await User.findByPk(userid, {
                include: {
                    model: User,
                    as: 'FavoritedUsers',
                    attributes: ['id', 'name', 'description', 'city', 'state', 'imageUrl']
                }
            });

            if (!user)
            {
                return res.status(404).json({ message: "Usuário não encontrado!" });
            }

            const favorites = user.FavoritedUsers.map(favorite => favorite.get({ plain: true }));

            return res.status(200).json({ favorites });
        } catch (error)
        {
            console.error("Erro ao buscar favoritos:", error);
            return res.status(500).json({ message: "Erro ao buscar favoritos." });
        }
    }

    static async addFavorite(req, res)
    {
        const userid = req.session.userid;
        const favoriteid = req.params.id;

        try
        {
            const user = await User.findByPk(userid);
            const favoriteUser = await User.findByPk(favoriteid);

            if (!user || !favoriteUser)
            {
                return res.status(404).json({ message: "Usuário ou favorito não encontrado!" });
            }

            const favorite = await Favorite.findOne({
                where: { userid: userid, favoriteid: favoriteid }
            });

            if (favorite)
            {
                await favorite.destroy();
                return res.status(200).json({ message: "Favorito removido com sucesso!", removed: true });
            } else
            {
                await Favorite.create({ userid: userid, favoriteid: favoriteid });
                return res.status(200).json({ message: "Favorito adicionado com sucesso!", removed: false });
            }
        } catch (error)
        {
            console.error("Erro ao alternar favorito:", error);
            return res.status(500).json({ message: "Erro ao alternar favorito." });
        }
    }

    static async removeMusicFromAlbum(req, res)
    {
        const { albumId, musicId } = req.params;

        try
        {
            const user = await User.findOne({
                where: { id: req.session.userid },
                include: [{ model: Artist }]
            });

            if (!user || !user.Artist)
            {
                return res.status(403).json({
                    success: false,
                    message: "Usuário não é um artista!"
                });
            }

            const album = await Album.findOne({
                where: {
                    id: albumId,
                    userid: user.Artist.cpf
                }
            });

            if (!album)
            {
                return res.status(404).json({
                    success: false,
                    message: "Álbum não encontrado ou você não tem permissão!"
                });
            }

            const music = await Music.findByPk(musicId);
            if (!music)
            {
                return res.status(404).json({
                    success: false,
                    message: "Música não encontrada!"
                });
            }

            await album.removeMusic(music);

            return res.json({
                success: true,
                message: "Música removida do álbum com sucesso!"
            });

        } catch (error)
        {
            console.error("Erro ao remover música do álbum:", error);
            return res.status(500).json({
                success: false,
                message: "Erro interno do servidor!",
                error: error.message
            });
        }
    }

    static async getAllReviews(req, res)
    {
        const { id } = req.params;

        try
        {
            const allReviews = await Rating.findAll({
                where: { receiverUserid: id },
                include: [
                    {
                        model: User,
                        as: 'Sender',
                        attributes: ['id', 'name', 'imageUrl']
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            const reviewsData = allReviews.map(review => ({
                id: review.id,
                rating: review.rate,
                description: review.description,
                senderName: review.Sender.name,
                senderId: review.Sender.id,
                senderImageUrl: review.Sender.imageUrl,
                createdAt: review.createdAt
            }));

            return res.json({ reviews: reviewsData });
        } catch (error)
        {
            console.error('Erro ao buscar todas as reviews:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}