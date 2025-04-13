const bcrypt = require('bcryptjs')
const validator = require('cpf-cnpj-validator')
const Artist = require('../models/Artist')
const Establishment = require('../models/Establishment')

module.exports = class AuthController
{
    static login(req, res)
    {
        if (req.session.userid)
        {
            return res.redirect('/dashboard')
        }

        res.render('auth/login')
    }

    static async registerArtist(req, res)
    {
        res.render('auth/registerArtist', { hideNavbar: true })
    }

    static async registerEstablishment(req, res)
    {
        res.render('auth/registerEstablishment', { hideNavbar: true })
    }

    static async registerArtistPost(req, res)
    {
        const { name, email, cellphone, cpf, password, confirmPassword } = req.body

        //password match validation
        if (password != confirmPassword)
        {
            req.flash('message', "As senhas não são iguais, verifique e tente novamente!")
            req.flash('messageType', 'error')
            res.redirect('/registerArtist')

            return;
        }

        const checkIfUserExists = await Artist.findOne({ where: { email: email } })

        if (checkIfUserExists)
        {
            req.flash('message', 'Já existe uma conta cadastrada com esse e-mail!')
            req.flash('messageType', 'error')
            res.redirect('/registerArtist')

            return;
        }

        const checkIfCPFIsValid = validator.cpf.isValid(cpf)

        if (!checkIfCPFIsValid)
        {
            req.flash('message', 'O número de CPF fornecido não é válido!')
            req.flash('messageType', 'error')
            res.redirect('/registerArtist')

            return;
        }

        //create password
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt)

        const artist =
        {
            name,
            email,
            password: hashedPassword,
            cellphone,
            cpf
        }

        try
        {
            const user = await Artist.create(artist);
            req.flash('message', 'Cadastro realizado com sucesso!')
            req.flash('messageType', 'success')

            req.session.userid = user.id
            req.session.username = user.name

            req.session.save(() =>
            {
                res.redirect('/')
            })
        }
        catch (err)
        {
            console.log(err)
        }
    }

    static async registerEstablishmentPost(req, res)
    {
        const { name, email, cellphone, cnpj, password, confirmPassword } = req.body

        //password match validation
        if (password != confirmPassword)
        {
            req.flash('message', "As senhas não são iguais, verifique e tente novamente!")
            req.flash('messageType', 'error')
            res.redirect('/registerEstablishment')

            return;
        }

        const checkIfUserExists = await Establishment.findOne({ where: { email: email } })

        if (checkIfUserExists)
        {
            req.flash('message', 'Já existe uma conta cadastrada com esse e-mail!')
            req.flash('messageType', 'error')
            res.redirect('/registerEstablishment')

            return;
        }

        const checkIfCNPJIsValid = validator.cnpj.isValid(cnpj)

        if (!checkIfCNPJIsValid)
        {
            req.flash('message', 'O número de CPF fornecido não é válido!')
            req.flash('messageType', 'error')
            res.redirect('/registerEstablishment')

            return;
        }

        //create password
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt)

        const establishment =
        {
            name,
            email,
            password: hashedPassword,
            cellphone,
            cnpj
        }

        try
        {
            const user = await Establishment.create(establishment);
            req.flash('message', 'Cadastro realizado com sucesso!')
            req.flash('messageType', 'success')

            req.session.userid = user.id
            req.session.username = user.name

            req.session.save(() =>
            {
                res.redirect('/')
            })
        }
        catch (err)
        {
            console.log(err)
        }
    }

    static async loginPost(req, res)
    {
        const { email, password } = req.body

        const [artist, establishment] = await Promise.all([
            Artist.findOne({ where: { email } }),
            Establishment.findOne({ where: { email } })
        ]);

        const user = artist || establishment;

        if (!user)
        {
            req.flash('message', "Este e-mail não está cadastrado!")
            req.flash('messageType', 'error')
            res.redirect('/login')

            return;
        }

        const passwordMatch = bcrypt.compareSync(password, user.password)

        if (!passwordMatch)
        {
            req.flash('message', "Senha incorreta!")
            req.flash('messageType', 'error')
            res.redirect('/login')

            return;
        }

        req.session.userid = user.id
        req.session.username = user.name
        req.flash('message', 'Login realizado com sucesso!')
        req.flash('messageType', 'success')

        req.session.save(() =>
        {
            res.redirect('/dashboard')
        })
    }

    static logout(req, res)
    {
        req.session.destroy()
        res.redirect('/login')
    }
}
