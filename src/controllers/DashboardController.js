const { Op } = require('sequelize');
const User = require("../models/User")

module.exports = class DashboardController
{
    static async showDashboard(req, res)
    {
        const users = await User.findAll()
        const info = users.map((result) => 
        {
            return result.dataValues
        });

        res.render('app/dashboard', { info , css: 'dashboard.css'})
    }
}