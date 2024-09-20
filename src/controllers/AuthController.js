const User = require('../models//user')
const Token = require('../models/token')
const bcrypt = require('bcryptjs')
const { where } = require('sequelize')
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { use } = require('../routes/thoughtsRoutes')
const { redirect } = require('statuses');
const session = require('express-session');

module.exports = class AuthController{

    static async login(req,res){
        res.render('auth/login', {session: req.session})
    }

    static async loginPost(req,res){
        
        const {email, password} = req.body

        const user = await User.findOne({where: {email:email}})

        if(!user || user == null){

            req.flash('message', '')
            req.flash('message', 'O email informado não está cadastrado')
            req.session.save(() => {

                res.redirect('/')
            })
        }
        else{
            let passwordMatch = bcrypt.compareSync(password,user.password)
        
        if(!passwordMatch){

            req.flash('message', 'Senha invalida!')
            req.session.save(() => {

                res.redirect('/')
            })
 
        }

        else{
            req.session.userid = user.id
            req.flash('message', 'Autenticação realizada com sucesso!')
            req.session.save(() => {
                res.redirect(`/thoughts/dashboard/${user.id}`)
            })

        }
        }
    }

    static async logout(req,res){
        
        req.session.destroy()
        res.redirect('/login')
    }

    static async register(req,res){
        res.render('auth/register')
    }

    static async postRegister(req,res){
        
        const {name, email, password, confirmPassword, cpf_cnpj, descricao, accountType, state, city} = req.body
        let imageUrl
        console.log(req.file)
        if(req.file){
            imageUrl = `/uploads/${req.file.filename}`;
        }
        else{
            imageUrl = '/img/User.png'
        }
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regex.test(email)){

            req.flash('message', 'Endereço de Email inváido!')
            res.render('auth/register')
            return
        }
        const apiKey = '6da1404dd0bccc266369810e5495509947162526';
        const response = await fetch(`https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${apiKey}`);
        const data = await response.json();
        console.log(data)
        if(!data.data.status === 'valid'){

            req.flash('message', 'Endereço de Email inváido!')
            res.render('auth/register')
            return
        }
        const auth = '15004%7CSgq5FoEVFxi3N3bGKEBQAUQy2DS67vQX';
        const response3 = await fetch(`https://api.invertexto.com/v1/validator?token=${auth}&value=${cpf_cnpj}&type=cnpj`);
        const response2 = await fetch(`https://api.invertexto.com/v1/validator?token=${auth}&value=${cpf_cnpj}&type=cpf`);
        const cpf = await response2.json();
        const cnpj = await response3.json();
        console.log(cpf,cnpj)
        if((accountType == 'Empresa' && cpf.valid) || (accountType == 'Artista' && cnpj.valid)){

            req.flash('message', 'CPF/CNPJ inválido')
            res.render('auth/register')
            return
        }
        if(!cpf.valid && !cnpj.valid){

            req.flash('message', 'CPF/CNPJ não encontrado!')
            res.render('auth/register')
            return
        }
        if(password.length < 6 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)){

            req.flash('message', 'A senha deve ter pelo menos 6 caracteres, incluindo no mínimo uma letra maiúscula, uma minúscula e um número')
            res.render('auth/register')
            return
        }

        if(password != confirmPassword){

            req.flash('message', 'As senhas não são identicas, tente novamente!')
            res.render('auth/register')
            return
        }
        
        const checkIfUserExists = await User.findOne({where: {email: email}})

        if(checkIfUserExists){

            req.flash('message', 'O email informado já está em uso')
            res.render('auth/register')
            return
        }

        const checkCredentials = await User.findOne({where: {CPF_CNPJ: cpf_cnpj}})

        if(checkCredentials){

            req.flash('message', 'CPF/CNPJ já cadastrado!')
            res.render('auth/register')
            return
        }

        const salt = bcrypt.genSaltSync(10)

        const hashedPassword = bcrypt.hashSync(password, salt)

        const user = {

            name,
            email,
            password:hashedPassword,
            img: imageUrl,
            accountType: accountType,
            description: descricao,
            CPF_CNPJ: cpf_cnpj,
            state: state,
            city: city
        }

        try{
            const createdUser = await User.create(user)
            req.session.userid = createdUser.id
            req.flash('message', 'cadastro realizado com sucesso!')
            req.session.save(() => {

                res.redirect('/')
            })
        }
        catch(err){
            console.log(err)
        }
        
    }

    static async resetPassword(req,res){

        const user = await User.findOne({where: {email: req.params.email}})
        const token = await Token.findOne({where: {UserId: user.id,status: true}})
        let message 
        console.log( bcrypt.compareSync(req.body.oldPassword,user.password))
        if(token.code == req.body.token && bcrypt.compareSync(req.body.oldPassword,user.password) && !(req.body.oldPassword == req.body.newPassword) && !(req.body.newPassword.length < 6 || !/[A-Z]/.test(req.body.newPassword) || !/[a-z]/.test(req.body.newPassword) || !/[0-9]/.test(req.body.newPassword))){

            const salt = bcrypt.genSaltSync(10)
            const hashedPassword = bcrypt.hashSync(req.body.newPassword, salt)
            const newUser = {id: user.id, email: user.email, name: user.name, password: hashedPassword}
            const newToken = {id: token.id, code: token.code, status: false, UserId: token.UserId}
            await User.update(newUser,{where: {id: user.id}})
            await Token.update(newToken,{where: {id:token.id}})
            console.log('deu certo',req.body)
            message = 'Senha alterada com sucesso!'
        }
        else{
            message = 'Algo deu errado!'
        }
            req.flash('message', message)
                
            req.session.save(() => {

                res.redirect('/')
            })
    }

    

    static async generateToken(req,res){
        res.render('auth/resetPassword')
    }

}