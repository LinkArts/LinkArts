function checkAuth(req, res, next)
{
    if (!req.session || !req.session.userid)
    {
        // Se for uma requisição AJAX/fetch, retornar JSON
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1))
        {
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

    if (req.session.isSuspended)
    {
        req.session.destroy(() =>
        {
            res.redirect('/login?message=Sua%20conta%20est%C3%A1%20suspensa.%20Entre%20em%20contato%20com%20o%20suporte.&type=error');
        });
        return;
    }

    next()
}

module.exports = { checkAuth }