const { Op, Model } = require('sequelize');

const { User, Artist, Establishment, Album, Music, Genre } = require('../models/index')

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
                                { model: Music, as: 'Musics', required: false },
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
                    musics: user.Artist?.Musics?.map(music => music.dataValues) || [],
                    albums: user.Artist?.Albums?.map(album => album.dataValues) || []
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

    static async getAlbums(req, res)
    {
        console.log("GET ALBUMS!!!")

        try
        {
            const user = await User.findOne({ where: { id: req.session.userid }, include: [{ model: Artist }] })

            const albums = await Album.findAll({ where: { userid: user.Artist.cpf } })

            return res.json({ albums: albums?.map((album) => album.dataValues) || [] })
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

            console.log(music.get({ plain: true }));

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
        const { title, genre, album } = req.body

        try
        {
            const music = await Music.findOne({
                where: {
                    id: id
                },
                include: [{
                    model: Album,
                    where: { name: album },
                    required: false
                }]
            })

            if (!music)
            {
                return res.json({ message: "Música não encontrada!" })
            }
            
            const updatedMusic = await music.update({
                name: title,
                description: genre,
            })

            updatedMusic.setAlbum(music.Album.id)

            const data = updatedMusic.get({ plain: true })
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
        const { title, genre, album } = req.body
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
                description: genre,
                image: null,
                genreid: null,
                userid: data.Artist.cpf
            })

            await user.Artist.Albums[0].addMusic(savedMusic);

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
}