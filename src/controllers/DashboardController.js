module.exports = class DashboardController
{
    static showDashboard(req, res)
    {
        res.render('auth/dashboard')
    }
}