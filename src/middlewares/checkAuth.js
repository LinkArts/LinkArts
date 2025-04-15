function checkAuth(req, res, next)
{
    console.log('checkAuth ROTA:', req.path)
    console.log('session userid:', req.session.userid)
    if (!req.session.userid)
    {
        req.flash('message', 'Sua sessão expirou. Faça login novamente.')
        req.flash('messageType', 'error')
        return res.redirect('/login') // redireciona para tela de login
    }

    next()
}

module.exports = { checkAuth }