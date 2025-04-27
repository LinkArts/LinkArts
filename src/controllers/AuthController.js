const bcrypt = require('bcryptjs')
const validator = require('cpf-cnpj-validator')
const jwt = require('jsonwebtoken')
const { sendEmail, getTemplate } = require('../utils/mailer')

const codes = new Map()

const User = require('../models/User')
const Artist = require('../models/Artist')
const Establishment = require('../models/Establishment')
const PendingUser = require('../models/PendingUser')
const Token = require('../models/Token')

module.exports = class AuthController
{
    static renderLogin(req, res)
    {
        if (req.session.userid)
        {
            return res.redirect('/dashboard')
        }

        res.render('auth/login', { css: 'login.css' })
    }

    static async renderRegisterArtist(req, res)
    {
        res.render('auth/registerArtist', { hideNavbar: true, css: 'registroArtista.css' })
    }

    static async renderRegisterEstablishment(req, res)
    {
        res.render('auth/registerEstablishment', { hideNavbar: true, css: 'registroEstabelecimento.css' })
    }

    static async postRegisterArtist(req, res)
    {
        const { name, email, cellphone, cpf, password, confirmPassword } = req.body

        //password match validation
        if (password != confirmPassword)
        {
            req.flash('message', "As senhas não são iguais, verifique e tente novamente!")
            req.flash('messageType', 'error')
            res.redirect('/registro-artista')

            return;
        }

        const checkIfCPFExists = await Artist.findOne({ where: { cpf: cpf } })

        if (checkIfCPFExists)
        {
            req.flash('message', 'Já existe uma conta cadastrada com esse CPF!')
            req.flash('messageType', 'error')
            res.redirect('/registro-artista')

            return;
        }

        const checkIfEmailExists = await User.findOne({ where: { email: email } })

        if (checkIfEmailExists)
        {
            req.flash('message', 'Já existe uma conta cadastrada com esse e-mail!')
            req.flash('messageType', 'error')
            res.redirect('/registro-artista')

            return;
        }

        const checkIfPendingUser = await PendingUser.findOne({ where: { email: email } })

        if (checkIfPendingUser)
        {
            req.flash('message', 'Já uma conta cadastrada com esse e-mail aguardando confirmação!')
            req.flash('messageType', 'error')
            res.redirect('/registro-artista')

            return;
        }

        const checkIfCPFIsValid = validator.cpf.isValid(cpf)

        if (!checkIfCPFIsValid)
        {
            req.flash('message', 'O número de CPF fornecido não é válido!')
            req.flash('messageType', 'error')
            res.redirect('/registro-artista')

            return;
        }

        //create password
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt)

        const userInfo =
        {
            name: name,
            email: email,
            password: hashedPassword,
            cellphone: cellphone,
            type: 'artist',
            document: cpf
        }

        try
        {
            const user = await PendingUser.create(userInfo);
            const token = jwt.sign(
                { email: email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' })


            const finalHtml = getTemplate('confirmation')({
                name: user.name,
                confirmationUrl: `http://localhost:3000/confirm/${ user.id }/${ token }`
            })

            sendEmail(email, 'Confirmação de Conta: LinkArts', finalHtml)

            req.flash('message', 'Uma mensagem de confirmação foi enviada ao seu e-mail!')
            req.flash('messageType', 'notification')

            /*req.session.userid = user.id
            req.session.username = user.name*/

            res.redirect('/registro-artista')
            /*req.session.save(() =>
            {
            })*/
        }
        catch (err)
        {
            console.log(err)
        }
    }

    static async postRegisterEstablishment(req, res)
    {
        /*const { name, email, cellphone, cnpj, password, confirmPassword } = req.body

        //password match validation
        if (password != confirmPassword)
        {
            req.flash('message', "As senhas não são iguais, verifique e tente novamente!")
            req.flash('messageType', 'error')
            res.redirect('/registro-estabelecimento')

            return;
        }

        const checkIfCNPJExists = await Establishment.findOne({ where: { cnpj: cnpj } })

        if (checkIfCNPJExists)
        {
            req.flash('message', 'Já existe uma conta cadastrada com esse CNPJ!')
            req.flash('messageType', 'error')
            res.redirect('/registro-estabelecimento')

            return;
        }

        const checkIfEmailExists = await User.findOne({ where: { email: email } })

        if (checkIfEmailExists)
        {
            req.flash('message', 'Já existe uma conta cadastrada com esse e-mail!')
            req.flash('messageType', 'error')
            res.redirect('/registro-estabelecimento')

            return;
        }

        const checkIfCNPJIsValid = validator.cnpj.isValid(cnpj)

        if (!checkIfCNPJIsValid)
        {
            req.flash('message', 'O número de CPF fornecido não é válido!')
            req.flash('messageType', 'error')
            res.redirect('/registro-estabelecimento')

            return;
        }

        //create password
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt)

        const userInfo =
        {
            name: name,
            email: email,
            password: hashedPassword,
            cellphone: cellphone,
        }

        try
        {
            const user = await User.create(userInfo);
            const establishment = await Establishment.create({ cnpj: cnpj, userid: user.id })
            req.flash('message', 'Cadastro realizado com sucesso!')
            req.flash('messageType', 'success')

            req.session.userid = user.id
            req.session.username = user.name

            req.session.save(() =>
            {
                res.redirect('/dashboard')
            })
        }
        catch (err)
        {
            console.log(err)
        }*/

        const { name, email, cellphone, cnpj, password, confirmPassword } = req.body

        //password match validation
        if (password != confirmPassword)
        {
            req.flash('message', "As senhas não são iguais, verifique e tente novamente!")
            req.flash('messageType', 'error')
            res.redirect('/registro-estabelecimento')

            return;
        }

        const checkIfCNPJExists = await Establishment.findOne({ where: { cnpj: cnpj } })

        if (checkIfCNPJExists)
        {
            req.flash('message', 'Já existe uma conta cadastrada com esse CNPJ!')
            req.flash('messageType', 'error')
            res.redirect('/registro-estabelecimento')

            return;
        }

        const checkIfEmailExists = await User.findOne({ where: { email: email } })

        if (checkIfEmailExists)
        {
            req.flash('message', 'Já existe uma conta cadastrada com esse e-mail!')
            req.flash('messageType', 'error')
            res.redirect('/registro-estabelecimento')

            return;
        }

        const checkIfPendingUser = await PendingUser.findOne({ where: { email: email } })

        if (checkIfPendingUser)
        {
            req.flash('message', 'Já uma conta cadastrada com esse e-mail aguardando confirmação!')
            req.flash('messageType', 'error')
            res.redirect('/registro-estabelecimento')

            return;
        }

        const checkIfCNPJIsValid = validator.cnpj.isValid(cnpj)

        if (!checkIfCNPJIsValid)
        {
            req.flash('message', 'O número de CNPJ fornecido não é válido!')
            req.flash('messageType', 'error')
            res.redirect('/registro-estabelecimento')

            return;
        }

        //create password
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt)

        const userInfo =
        {
            name: name,
            email: email,
            password: hashedPassword,
            cellphone: cellphone,
            type: 'establishment',
            document: cnpj
        }

        try
        {
            const user = await PendingUser.create(userInfo);
            const token = jwt.sign(
                { email: email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' })

            const finalHtml = getTemplate('confirmation')({
                name: user.name,
                confirmationUrl: `http://localhost:3000/confirm/${ user.id }/${ token }`
            })

            sendEmail(email, 'Confirmação de Conta: LinkArts', finalHtml)

            req.flash('message', 'Uma mensagem de confirmação foi enviada ao seu e-mail!')
            req.flash('messageType', 'notification')

            /*req.session.userid = user.id
            req.session.username = user.name*/

            res.redirect('/registro-estabelecimento')
            /*req.session.save(() =>
            {
            })*/
        }
        catch (err)
        {
            console.log(err)
        }
    }

    static async postLogin(req, res)
    {
        const { email, password } = req.body

        //Com a tabela user não é mais necessário fazer duas pesquisas
        /*const [artist, establishment] = await Promise.all([
            Artist.findOne({ where: { email } }),
            Establishment.findOne({ where: { email } })
        ]);
        const user = artist || establishment;*/

        try
        {
            const user = await User.findOne({ where: { email: email } })

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
        catch (err)
        {
            console.log('Erro: ' + err);
        }
    }

    static logout(req, res)
    {
        req.session.destroy()
        res.redirect('/login')
    }

    static renderChangePassword(req, res)
    {
        res.render('auth/changePassword', { css: 'recuperarSenha.css' })
    }

    static async confirmAccount(req, res)
    {
        console.log('RODANDO FUNÇÃO CONFIRMACCOUNT()');
        console.log('req.url:', req.url);
        
        const { id, token } = req.params

        const pendingUser = await PendingUser.findOne({ where: { id: id } })
        console.log(pendingUser.dataValues.name);

        try
        {
            const verify = jwt.verify(token, process.env.JWT_SECRET)

            if (pendingUser.type === 'artist')
            {
                const user = await User.create({
                    name: pendingUser.name,
                    email: pendingUser.email,
                    password: pendingUser.password,
                    cellphone: pendingUser.cellphone,
                })

                const artist = await Artist.create({
                    cpf: pendingUser.document,
                    userid: user.id
                })

                await PendingUser.destroy({ where: { document: artist.cpf } })

                req.session.userid = user.id
                req.session.username = user.name
                req.flash('message', 'Login realizado com sucesso!')
                req.flash('messageType', 'success')

                req.session.save(() =>
                {
                    return res.redirect('/dashboard')
                })
            }
            else if (pendingUser.type === 'establishment')
            {
                const user = await User.create({
                    name: pendingUser.name,
                    email: pendingUser.email,
                    password: pendingUser.password,
                    cellphone: pendingUser.cellphone,
                })

                const establishment = await Establishment.create({
                    cnpj: pendingUser.document,
                    userid: user.id
                })

                await PendingUser.destroy({where: { document: establishment.cnpj }})

                req.session.userid = user.id
                req.session.username = user.name
                req.flash('message', 'Login realizado com sucesso!')
                req.flash('messageType', 'success')
                console.log("SUCESSO!!!");
                

                req.session.save((err) =>
                {
                    if (err)
                    {
                        console.log('ERRO AO SALVAR A SESSÃO: ' + err);
                    }
                    
                    console.log("SALVANDO SESSION...");
                    
                    return res.redirect('/dashboard')
                })
            }
        }
        catch (err)
        {
            console.log(err);
            
            if (err.name === 'TokenExpiredError')
            {
                req.flash('message', 'Seu código expirou, faça o cadastro novamente!')
                req.flash('messageType', 'error')
                return res.redirect('/login')
            }
            else if (err.name == 'JsonWebTokenError')
            {
                req.flash('message', 'Código de confirmação inválido, verifique e tente novamente!')
                req.flash('messageType', 'error')
                return res.redirect('/login')
            }
            else
            {
                req.flash('message', 'Erro ao confirmar conta!')
                req.flash('messageType', 'error')
                return res.redirect('/login')
            }
        }
    }

    static gerarCodigo(length = 6)
    {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let codigo = '';
        for (let i = 0; i < length; i++)
        {
            const randomIndex = Math.floor(Math.random() * chars.length);
            codigo += chars[randomIndex];
        }

        return codigo;
    }

    static async postVerifyEmail(req, res)
    {
        const { email } = req.body

        const user = await User.findOne({ where: { email: email } })

        if (!user)
        {
            req.flash('message', 'Não há uma conta cadastrada com esse e-mail!')
            req.flash('messageType', 'error')
            return res.json({ redirect: '/alterar-senha' })
        }

        const codigo = AuthController.gerarCodigo()
        const passwordHtml = getTemplate('password')({
            name: user.name,
            passwordCode: codigo
        })

        codes.set(email,
            {
                code: codigo,
                expiresAt: Date.now() + 5 * 60 * 1000
            })

        res.json({ message: 'Código enviado para o e-mail!', })

        sendEmail(email, 'Código de Alteração de Senha', passwordHtml)
    }

    static async alterarSenha(req, res)
    {
        const { email, code, password, confirmPassword } = req.body
        console.log(email);

        const validate = codes.get(email)
        console.log(validate);

        if (!validate)
        {
            req.flash('message', 'Algo deu errado!')
            req.flash('messageType', 'error')
            return res.json({ redirect: '/alterar-senha' })
        }

        if (code != validate.code)
        {
            req.flash('message', 'O código digitado não é o mesmo!')
            req.flash('messageType', 'error')
            return res.json({ redirect: '/alterar-senha' })
        }

        if (Date.now() > validate.expiresAt)
        {
            req.flash('message', 'Seu código expirou!')
            req.flash('messageType', 'error')
            return res.json({ redirect: '/alterar-senha' })
        }

        if (password != confirmPassword)
        {
            req.flash('message', 'A confirmação de senha não confere, tente novamente!')
            req.flash('messageType', 'error')
            return res.json({ redirect: '/alterar-senha' })
        }

        try
        {
            const user = await User.findOne({ where: { email: email } })

            if (!user)
            {
                req.flash('message', 'Houve um problema ao procurar o usuário!')
                req.flash('messageType', 'error')
                return res.json({ redirect: '/alterar-senha' })
            }

            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(password, salt)

            user.update({ password: hashedPassword })

            req.flash('message', 'Senha alterada com sucesso!')
            req.flash('messageType', 'success')
            res.json({ redirect: '/login' })
        }
        catch (err)
        {
            console.log(err);
            return res.json({ redirect: '/login' })
        }
    }
}
