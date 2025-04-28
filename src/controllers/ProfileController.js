const { Op } = require('sequelize');
const User = require('../models/User')

module.exports = class ProfileController
{
    static async showProfile(req, res)
    {
        const { id } = req.params

        try
        {
            const user = await User.findOne({ where: { id: id } })

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

            return res.render('app/profile', { css: 'perfil.css' })
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
}