const { Op } = require('sequelize');

module.exports = class ProfileController
{
    static async showProfile(req, res)
    {
        res.render('app/profile')
    }
}