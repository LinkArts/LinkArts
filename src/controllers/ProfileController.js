const { Op, Model, fn, col, where } = require('sequelize');

const { User, Artist, Establishment, Album, Music, Genre, Tag } = require('../models/index');
const { raw } = require('mysql2');

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
                        { model: Establishment, required: false }
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

            if (user.Establishment)
            {
                const values = {
                    ...user.dataValues,
                    ...user.Establishment.dataValues,
                }
                return res.render('app/profileEstablishment', { values, css: 'perfilEstabelecimento.css' })
            }
            else if (user.Artist)
            {
                const values = {
                    ...user.dataValues,
                    ...user.Artist.dataValues,
                    musics: musicsTags,
                    albums: user.Artist?.Albums?.map(album => album.dataValues) || [],
                    tags: [...new Set(user.Artist?.Musics?.flatMap(music => music.Tags?.map(tag => tag.dataValues) || []))] || []
                }

                return res.render('app/profileArtist', { values, css: 'perfilArtista.css' })
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

            console.log(user.get({ plain: true }))
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
            console.log(data)

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
        //checar palavroes

        /*const checkGenre = await Genre.findOne({ where: { genre: generoMusica } })
        if (!checkGenre)
        {
            req.flash('message', 'O gênero não é valido!')
            req.flash('messageType', 'error')
            return res.redirect('/profile/:id')
        }*/

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
}