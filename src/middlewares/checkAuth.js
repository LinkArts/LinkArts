function checkAuth(req, res, next)
{
    if (!req.session.userid)
    {
        // Se for uma requisição AJAX/fetch, retornar JSON
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.status(401).json({ 
                success: false, 
                message: 'Sua sessão expirou. Faça login novamente.',
                redirect: '/login'
            });
        }
        
        // Se for uma requisição normal, redirecionar
        req.flash('message', 'Sua sessão expirou. Faça login novamente.')
        req.flash('messageType', 'error')
        return res.redirect('/login')
    }

    next()
}

module.exports = { checkAuth }