const { Op } = require('sequelize');

module.exports = class ProfileController
{
    static async showProfile(req, res)
    {
        if (!req.params.id)
        {
            console.log("Nao há ID!")
            res.render('auth/login')
        }

        res.render('app/profile')
    }
}