const { Op } = require('sequelize');
const Artist = require("../models/Artist")

module.exports = class DashboardController
{
    static async showDashboard(req, res)
    {
        const artists = await Artist.findAll()
        const info = artists.map((result) => 
        {
            return result.dataValues
        });

        res.render('app/dashboard', { info })
    }
}