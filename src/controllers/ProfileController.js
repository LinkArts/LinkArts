const { Op, Model } = require('sequelize');
const User = require('../models/User')
const Music = require('../models/Music')
const Genre = require('../models/Genre');
const Artist = require('../models/Artist');
const Establishment = require('../models/Establishment');
const Album = require('../models/Album');

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
                                { model: Music, required: false },
                                { model: Album, required: false }
                            ]
                        },
                        { model: Establishment, required: false }
                    ],
                    exclude: ['password']
                })

            user?.Artist?.Albums.forEach((album) => console.log(album.dataValues))

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

    static async showMusic(req, res)
    {

    }

    static async saveMusic(req, res)
    {
        const { nomeMusica, descricaoMusica, imagemMusica, generoMusica } = req.body
        //checar palavroes

        const checkGenre = await Genre.findOne({ where: { genre: generoMusica } })
        if (!checkGenre)
        {
            req.flash('message', 'O gênero não é valido!')
            req.flash('messageType', 'error')
            return res.redirect('/profile/:id')
        }
        try
        {
            const savedMusic = await Music.create({
                name: nomeMusica,
                description: descricaoMusica,
                image: imagemMusica,
                genreid: checkGenre.id
            })
        }
        catch (error)
        {
            req.flash('message', 'A música não foi salva corretamente!')
            req.flash('messageType', 'error')
            return res.redirect('/profile/:id')

        }

    }
}