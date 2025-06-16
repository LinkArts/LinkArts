const { Op, Model, fn, col, where } = require('sequelize');

const { User, Artist, Establishment, Album, Music, Genre, Tag, Event, ServiceRequest } = require('../models/index');

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
                    serviceRequests: user.toJSON().Establishment.ServiceRequests
                }
                return res.render('app/profileEstablishment', { values, isOwner, css: 'perfilEstabelecimento.css' })
            }
            else if (user.Artist)
            {
                const uniqueTags = [
                    ...new Map(
                        user.Artist?.Musics?.flatMap(music => music.Tags || []).map(tag => [tag.id, tag])
                    ).values()
                ];

                const values = {
                    ...user.dataValues,
                    ...user.Artist.dataValues,
                    musics: musicsTags,
                    albums: user.Artist?.Albums?.map(album => album.dataValues) || [],
                    tags: uniqueTags.map(tag => tag.dataValues) || []
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
        const { albumName } = req.body

        try
        {
            const album = await Album.findOne({ where: { name: albumName } })
            const user = await User.findOne({ where: { id: req.session.userid }, include: [{ model: Artist }] })

            if (album)
            {
                return res.json({ message: "Album ja existente!!" })
            }

            const result = await Album.create({ name: albumName, userid: user.Artist.cpf })
            return res.json({ id: result.dataValues.id, message: `O album ${ albumName } foi criado com sucesso!!!` })
        }
        catch (err)
        {
            console.log(err)
            return res.json({ message: "ERRO!!!!!" })
        }
    }

    static async searchAlbum(req, res)
    {
        console.log("SEARCH ALBUM!!!");

        const { name } = req.params

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
                                where(fn('lower', col('name')), name.toLowerCase())
                            ]
                        }
                    }]
                }]
            })

            if (user.Artist.Albums.length > 0)
            {
                return res.json({ albumExists: true })
            }

            return res.json({ albumExists: false })
        }
        catch (error)
        {
            console.log(error)
            return res.json({ message: "ERRO!!!" })
        }
    }

    static async getAlbums(req, res)
    {
        console.log("GET ALBUMS!!!")

        try
        {
            const user = await User.findOne({ where: { id: req.session.userid }, include: [{ model: Artist, include: [{ model: Album }] },] })

            const data = user.get({ plain: true })

            return res.json({ albums: data.Artist.Albums })
        }
        catch (err)
        {
            console.log(err)
            return res.json({ message: "ERRO!!!!!" })
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
                include: [{
                    model: Album,
                    required: false
                }]
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
        const { title, tags, album } = req.body

        console.log("UPDATE MUSIC!!!")

        try
        {
            const music = await Music.findOne({
                where: {
                    id: id
                },
                include: [{
                    model: Album,
                    required: false
                }]
            })

            if (!music)
            {
                return res.json({ message: "Música não encontrada!" })
            }

            const updatedMusic = await music.update({
                name: title,
            })

            if (album != music.Albums[0].name)
            {
                const newAlbum = await Album.findOne({ where: { name: album } })
                updatedMusic.setAlbums(newAlbum.id)
            }

            const data = updatedMusic.get({ plain: true })
            updatedMusic.setTags([])
            updatedMusic.setTags(tags.map(Number))

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
        const { title, tag, album } = req.body

        const user = await User.findOne({
            where: {
                id: req.session.userid,
            },
            include: [{
                model: Artist,
                include: [{
                    model: Album,
                    where: { name: album },
                }]
            }]
        })

        if (!user)
        {
            return res.json({ message: "Usuario não encontrado!" })
        }

        if (!user.Artist.Albums)
        {
            return res.json({ message: "Usuario não tem album!" })
        }

        const data = {
            ...user.dataValues,
            ...user.Artist.dataValues,
            album: user.Artist.Albums.dataValues || null,
        }

        try
        {
            const savedMusic = await Music.create({
                name: title,
                description: null,
                image: null,
                genreid: null,
                userid: data.Artist.cpf
            })

            await user.Artist.Albums[0].addMusic(savedMusic);
            await savedMusic.addTags(tag.map(Number))

            return res.json({ message: `A música ${ title } foi criada com sucesso!`, songid: savedMusic.id })
        }
        catch (error)
        {
            /*req.flash('message', 'A música não foi salva corretamente!')
            req.flash('messageType', 'error')
            return res.redirect('/profile/:id')*/

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
        const { name, city, description, linkedin, instagram, facebook } = req.body

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

            return res.json({ message: `O perfil foi atualizado com sucesso!`, user: user })
        }
        catch (error)
        {
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

    static async getUserData(req, res) {
        const id = req.session.userid;

        try {
            const user = await User.findOne({
                where: { id: id },
                include: [{
                    model: Artist,
                    required: false
                }],
                attributes: { exclude: ['password'] }
            });

            if (!user) {
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
        } catch (error) {
            console.error("Erro ao buscar dados do usuário:", error);
            return res.status(500).json({ message: "Erro ao buscar dados do usuário." });
        }
    }
}