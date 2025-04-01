const bcrypt = require('bcryptjs')
const Artist = require('../models/Artist')

module.exports = class AuthController
{
    static login(req, res)
    {
        res.render('auth/login')
    }

    static async registerArtist(req, res)
    {
        res.render('auth/registerArtist')
    }

    static registerEstablishment(req, res)
    {
        res.render('auth/registerEstablishment')
    }

    static async registerArtistPost(req, res)
    {
        const { name, email, cellphone, cpf, password, confirmPassword } = req.body

        //password match validation
        if (password != confirmPassword)
        {
            req.flash('message', "As senhas não são iguais, verifique e tente novamente!")
            res.render('auth/registerArtist')

            return;
        }

        const checkIfUserExists = await Artist.findOne({ where: { email: email } })

        if (checkIfUserExists)
        {
            req.flash('message', 'Já existe uma conta cadastrada com esse e-mail!')
            res.render('auth/registerArtist')

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
            await Artist.create(artist);
            req.flash('message', 'Cadastro realizado com sucesso!')

            res.redirect('/')
        }
        catch (err)
        {
            console.log(err)
        }
    }

    static async registerEstablishmentPost(req, res)
    {
        console.log('teste')
    }
}
