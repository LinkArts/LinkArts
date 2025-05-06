const { Op } = require('sequelize');
const User = require('../models/User')
const Music = require('../models/Music')
const Genre = require('../models/Genre')

module.exports = class ProfileController {
    static async showProfile(req, res) {
        const { id } = req.params

        try {
            const user = await User.findOne({ where: { id: id } })

            if (!user) {
                req.flash('message', 'Não há um usuário com esse ID!')
                req.flash('messageType', 'notification')

                return req.session.save(() => {
                    if (!req.session.userid)
                        res.redirect('/login')
                    else
                        res.redirect('/dashboard')
                })
            }

            const musics = await Music.findAll({ where: {}})
            return res.render('app/profile', { css: 'perfil.css' })
        }
        catch (err) {
            console.log(err)

            req.flash('message', 'Algo deu errado!')
            req.flash('messageType', 'error')
            return req.session.save(() => {
                res.redirect('/login')
            })
        }
    }

    static async showMusic(req, res) {

    }

    static async saveMusic(req, res) {
        const { nomeMusica, descricaoMusica, imagemMusica, generoMusica } = req.body
        //checar palavroes

        const checkGenre = await Genre.findOne({ where: { genre: generoMusica } })
        if(!checkGenre){
            req.flash('message', 'O gênero não é valido!')
            req.flash('messageType', 'error')
            return res.redirect('/profile/:id')
        }
        try{
            const savedMusic = await Music.create({
                name: nomeMusica,
                description: descricaoMusica,
                image: imagemMusica,
                genreid: checkGenre.id
            })
        }
        catch(error){
            req.flash('message', 'A música não foi salva corretamente!')
            req.flash('messageType', 'error')
            return res.redirect('/profile/:id')

        }

    }
}