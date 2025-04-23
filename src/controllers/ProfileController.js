const { Op } = require('sequelize');
const User = require('../models/User')

module.exports = class ProfileController
{
    static async showProfile(req, res)
    {
        const id = req.params.id

        const user = await User.findOne({ where: { id: id } })

        if (!user)
        {
            req.flash('message', 'Não há um usuário com esse ID!')
            req.flash('messageType', 'notification')

            if (!req.session.userid)
                return res.redirect('/login')
            else
                return res.redirect('/dashboard')
        }

        res.render('app/profile', {css: 'perfil.css'})
    }
}