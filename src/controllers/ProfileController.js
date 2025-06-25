const { Op, Model, fn, col, where } = require('sequelize');
const sequelize = require('../db/conn');

const { User, Artist, Establishment, Album, Music, Tag, Event, ServiceRequest, Favorite } = require('../models/index');

module.exports = class ProfileController
{
    static async showProfile(req, res)
    {
        console.log("SHOW PROFILE!!!")
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

            const musicsTags = user.Artist?.Musics?.map(music => ({
                ...music.dataValues,
                tags: music.Tags?.map(tag => tag.dataValues) || []
            }));

            const isOwner = user.dataValues.id === req.session.userid

            if (user.Establishment)
            {
                const values = {
                    ...user.dataValues,
                    ...user.Establishment.dataValues,
                    events: user.toJSON().Establishment.Events,
                    serviceRequests: user.toJSON().Establishment.ServiceRequests,
                    imageUrl: user.imageUrl, // Incluir imageUrl do usuário
                    tags: user.Tags?.map(tag => tag.dataValues) || [] // Incluir tags do usuário
                }
                return res.render('app/profileEstablishment', { values, isOwner, css: 'perfilEstabelecimento.css' })
            }
            else if (user.Artist)
            {
                const values = {
                    ...user.dataValues,
                    ...user.Artist.dataValues,
                    musics: musicsTags,
                    albums: user.Artist?.Albums?.map(album => ({
                        ...album.dataValues,
                        imageUrl: album.imageUrl || '/img/default.jpg'
                    })) || [],
                    imageUrl: user.imageUrl, // Incluir imageUrl do usuário
                    tags: user.Tags?.map(tag => tag.dataValues) || [] // Incluir tags do usuário
                }

                return res.render('app/profileArtist', { values, isOwner, css: 'perfilArtista.css' })
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
        console.log("CREATE ALBUM")
        const { albumName, imageUrl } = req.body
        console.log("Dados recebidos:", { albumName, imageUrl, userId: req.session.userid })

        try
        {
            const album = await Album.findOne({ where: { name: albumName } })
            const user = await User.findOne({ where: { id: req.session.userid }, include: [{ model: Artist }] })

            if (!user) {
                console.log("Usuário não encontrado:", req.session.userid)
                return res.status(404).json({ message: "Usuário não encontrado!" })
            }

            if (!user.Artist) {
                console.log("Usuário não é um artista:", req.session.userid)
                return res.status(400).json({ message: "Usuário não é um artista!" })
            }

            if (album)
            {
                console.log("Álbum já existe:", albumName)
                return res.json({ message: "Album ja existente!!" })
            }

            console.log("Criando álbum:", { name: albumName, userid: user.Artist.cpf, imageUrl })
            const result = await Album.create({ 
                name: albumName, 
                userid: user.Artist.cpf,
                imageUrl: imageUrl || null
            })
            
            console.log("Álbum criado com sucesso:", result.dataValues)
            return res.json({ id: result.dataValues.id, message: `O album ${ albumName } foi criado com sucesso!!!` })
        }
        catch (err)
        {
            console.error("Erro ao criar álbum:", err)
            return res.status(500).json({ message: "Erro ao criar álbum!", error: err.message })
        }
    }

    static async updateAlbumCover(req, res)
    {
        console.log("UPDATE ALBUM COVER")
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

    static async deleteAlbum(req, res)
    {
        const { id } = req.params

        try
        {
            // Buscar o álbum
            const album = await Album.findByPk(id)
            
            if (!album) {
                return res.status(404).json({ 
                    success: false, 
                    message: "Álbum não encontrado!" 
                })
            }

            // Verificar se o usuário logado é o dono do álbum
            const userFromSession = await User.findOne({
                where: { id: req.session.userid },
                include: [{ model: Artist }]
            })

            if (!userFromSession || !userFromSession.Artist) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Usuário não é um artista!" 
                })
            }

            // Verificar se o álbum pertence ao artista logado
            if (album.userid !== userFromSession.Artist.cpf) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Você não tem permissão para excluir este álbum!" 
                })
            }

            // Buscar músicas relacionadas para informação
            const albumWithMusics = await Album.findOne({
                where: { id: id },
                include: [{ model: Music, required: false }]
            })

            const musicCount = albumWithMusics && albumWithMusics.Music ? albumWithMusics.Music.length : 0

            // Remover relacionamentos se houver músicas
            if (musicCount > 0) {
                try {
                    await sequelize.query(
                        'DELETE FROM "AlbumMusic" WHERE "albumid" = :albumId',
                        {
                            replacements: { albumId: id },
                            type: sequelize.QueryTypes.DELETE
                        }
                    )
                } catch (error) {
                    try {
                        await sequelize.query(
                            'DELETE FROM album_music WHERE albumid = :albumId',
                            {
                                replacements: { albumId: id },
                                type: sequelize.QueryTypes.DELETE
                            }
                        )
                    } catch (error2) {
                        // Se as tabelas não existem, pular essa etapa
                    }
                }
            }

            // Excluir o álbum
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
        console.log("SEARCH ALBUM!!!");

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
                            [Op.and]: [
                                where(fn('lower', col('name')), decodedName.toLowerCase())
                            ]
                        },
                        required: false
                    }]
                }]
            })

            if (!user || !user.Artist) {
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
        console.log("GET ALBUMS!!!")

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

            if (!user || !user.Artist) {
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
        console.log("SEARCH ALBUM MUSICS!!!")
        const { id } = req.params

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
                }]
            })

            if (!album)
            {
                return res.json({ message: "Album não encontrado!" })
            }

            const data = album.get({ plain: true })

            return res.json({ data })
        }
        catch (error)
        {
            console.log(error)
            return res.json({ message: "ERRO!!!" })
        }
    }

    static async searchMusic(req, res)
    {
        console.log('SEARCH!!!')
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
        const { title, tags, albums } = req.body

        console.log("UPDATE MUSIC!!!")

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
                return res.json({ message: "Música não encontrada!" })
            }

            const updatedMusic = await music.update({
                name: title,
            })

            // Atualizar álbuns da música
            if (albums && albums.length > 0) {
                // Buscar álbuns válidos
                const validAlbums = await Album.findAll({
                    where: {
                        name: albums
                    }
                });
                
                // Associar música aos novos álbuns
                await updatedMusic.setAlbums(validAlbums.map(album => album.id));
            } else {
                // Remover música de todos os álbuns
                await updatedMusic.setAlbums([]);
            }

            // Atualizar tags
            if (tags && tags.length > 0) {
                await updatedMusic.setTags([]);
                await updatedMusic.setTags(tags.map(Number));
            } else {
                await updatedMusic.setTags([]);
            }

            return res.json({ message: `A música ${ title } foi atualizada com sucesso!` })
        }
        catch (error)
        {
            console.log(error)
            return res.json({ message: "ERRO!!!" })
        }

    }

    static async createMusic(req, res)
    {
        const { title, tag, albums } = req.body

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
            return res.json({ message: "Usuario não encontrado!" })
        }

        if (!user.Artist)
        {
            return res.json({ message: "Usuario não é um artista!" })
        }

        try
        {
            const savedMusic = await Music.create({
                name: title,
                description: null,
                image: null,
                genreid: null,
                userid: user.Artist.cpf
            })

            // Adicionar tags à música
            if (tag && tag.length > 0) {
                await savedMusic.addTags(tag.map(Number))
            }

            // Adicionar música aos álbuns selecionados
            if (albums && albums.length > 0) {
                const selectedAlbums = await Album.findAll({
                    where: {
                        name: albums,
                        userid: user.Artist.cpf // Garantir que os álbuns pertencem ao artista
                    }
                });
                
                if (selectedAlbums.length > 0) {
                    await savedMusic.setAlbums(selectedAlbums.map(album => album.id));
                }
            }

            return res.json({ message: `A música ${ title } foi criada com sucesso!`, songid: savedMusic.id })
        }
        catch (error)
        {
            console.log(error)
            return res.json({ message: `ERRO!!!` })
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

        try
        {
            const user = await User.findByPk(id)

            if (!user)
            {
                return res.json({ message: "Usuário não encontrado!" })
            }

            const updatedUser = await user.update({
                name: name,
                city: city,
                description: description,
                instagram: instagram,
                facebook: facebook,
                linkedin: linkedin
            })

            // Atualizar tags do perfil
            if (tags !== undefined) {
                if (tags && tags.length > 0) {
                    await user.setTags(tags.map(Number));
                } else {
                    await user.setTags([]);
                }
            }

            return res.json({ message: `O perfil foi atualizado com sucesso!`, user: user })
        }
        catch (error)
        {
            console.log(error)
            return res.json({ message: "ERRO!!!" })
        }
    }

    static async getAllEvents(req, res)
    {
        try
        {
            const events = await Event.findAll({
                order: [['date', 'ASC'], ['id', 'ASC']]
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

        const user = await User.findOne({ where: { id: req.session.userid }, include: { model: Establishment } })
        const establishmentid = user.Establishment.dataValues.cnpj

        if (!title || !date || !establishmentid)
        {
            return res.status(400).json({ message: "Título, data e ID do estabelecimento são obrigatórios." })
        }

        try
        {
            const establishment = await Establishment.findByPk(establishmentid)
            if (!establishment)
            {
                return res.status(404).json({ message: "Estabelecimento não encontrado." })
            }

            const newEvent = await Event.create({
                title,
                date,
                description,
                imageUrl,
                establishmentid
            })
            return res.status(201).json(newEvent)
        } catch (error)
        {
            console.error("Erro ao criar evento:", error)
            return res.status(500).json({ message: "Erro ao criar evento.", error: error.message })
        }
    }

    static async updateEvent(req, res)
    {
        const id = req.params.id
        const { title, date, description, imageUrl } = req.body

        const user = await User.findOne({ where: { id: req.session.userid }, include: { model: Establishment } })
        const establishmentid = user.Establishment.dataValues.cnpj

        if (!title || !date || !establishmentid)
        {
            return res.status(400).json({ message: "Título, data e ID do estabelecimento são obrigatórios." })
        }

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
            const requests = await ServiceRequest.findAll({
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
        const { name, description, date, startTime, endTime, tags } = req.body

        const user = await User.findOne({ where: { id: req.session.userid }, include: { model: Establishment } })

        const establishmentid = user.Establishment.dataValues.cnpj

        if (!name || !date || !startTime || !establishmentid)
        {
            return res.status(400).json({ message: "Nome, data, hora de início e ID do estabelecimento são obrigatórios." })
        }

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
        const { name, description, date, startTime, endTime, tags } = req.body

        const user = await User.findOne({ where: { id: req.session.userid }, include: { model: Establishment } })
        const establishmentid = user.Establishment.dataValues.cnpj

        if (!name || !date || !startTime || !establishmentid)
        {
            return res.status(400).json({ message: "Nome, data, hora de início e ID do estabelecimento são obrigatórios." })
        }

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
                { name, description, date, startTime, endTime, tags: tags || [], establishmentid },
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
                include: [{
                    model: Artist,
                    required: false
                }],
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
                imageUrl: user.imageUrl
            };

            return res.json({ userData });
        } catch (error)
        {
            console.error("Erro ao buscar dados do usuário:", error);
            return res.status(500).json({ message: "Erro ao buscar dados do usuário." });
        }
    }

    static async searchFavorites(req, res) {
        const userid = req.session.userid;
    
        try {
            const user = await User.findByPk(userid, {
                include: {
                    model: User, // Inclui os dados completos dos usuários favoritados
                    as: 'FavoritedUsers', // Usa o alias único configurado na associação
                    attributes: { exclude: ['password'] }
                }
            });
    
            if (!user) {
                return res.status(404).json({ message: "Usuário não encontrado!" });
            }
    
            const favorites = user.FavoritedUsers.map(favorite => favorite.get({ plain: true }));
    
            return res.status(200).json({ favorites });
        } catch (error) {
            console.error("Erro ao buscar favoritos:", error);
            return res.status(500).json({ message: "Erro ao buscar favoritos." });
        }
    }

    static async addFavorite(req, res) {
        const userid = req.session.userid;
        const favoriteid = req.params.id;
    
        try {
            const user = await User.findByPk(userid);
            const favoriteUser = await User.findByPk(favoriteid);
    
            if (!user || !favoriteUser) {
                return res.status(404).json({ message: "Usuário ou favorito não encontrado!" });
            }
    
            const favorite = await Favorite.findOne({
                where: { userid: userid, favoriteid: favoriteid }
            });
    
            if (favorite) {
                // Remove o favorito
                await favorite.destroy();
                return res.status(200).json({ message: "Favorito removido com sucesso!", removed: true });
            } else {
                // Adiciona o favorito
                await Favorite.create({ userid: userid, favoriteid: favoriteid });
                return res.status(200).json({ message: "Favorito adicionado com sucesso!", removed: false  });
            }
        } catch (error) {
            console.error("Erro ao alternar favorito:", error);
            return res.status(500).json({ message: "Erro ao alternar favorito." });
        }
    }
}