const User = require('../models/user')
const Talk = require('../models/talk')
const session = require('express-session')
const axios = require('axios')
const { use } = require('../routes/thoughtsRoutes')
const { Op, where } = require('sequelize');
const Proposta = require('../models/proposta')
const moment = require('moment');
const Local = require('../models/locais')

module.exports = class ThoughtController{

    static async dashboard(req,res){
       
        console.log(req.session.userId)
        if(req.session.userId){
        const user = await User.findOne({where: {id:req.session.userId}})
        let connections
        let isEmpresa
        if(user.accountType == 'Empresa'){
            isEmpresa = true
            connections = await User.findAll({where: {accountType:'Artista'}})
        }
        else{
            isEmpresa = false
            connections = await User.findAll({where: {accountType:'Empresa'}})
        }
       let propostas = await Proposta.findAll({
            where: {
              [Op.or]: [
                { senderId: req.session.userId },
                { receiverId: req.session.userId }
              ],
              status: 'aceita'
            },
          });
        const hoje = new Date();  // Data de hoje
        propostas.forEach(async prop => {

            if(req.session.userId == prop.senderId){
            prop.empresa = await User.findOne({where: {id: prop.receiverId}})
            }
            else{
                prop.empresa = await User.findOne({where: {id: prop.senderId}})
            }
            const data = new Date(prop.data)
            if (data < hoje) {
                const newProp = {
                    id : prop.id,
                    data: prop.data,
                    hora: prop.hora,
                    local: prop.local,
                    valorHora: prop.valorHora,
                    mensagem: prop.mensagem,
                    senderId: prop.senderId,
                    receiverId: prop.receiverId,
                    status: 'expirada'
                }
                await Proposta.update(newProp,{where:{id:prop.id}})
                console.log(`Proposta inválida: ${prop.id}`);
            }
        })
        // Filtra as propostas removendo aquelas com data inválida
        propostas = propostas.filter(prop => {
            const data = new Date(prop.data);
            
            // Se a data for menor que hoje, considera inválida
            if (data < hoje) {
                return false; // Remove a proposta
            }
        
            // Formata a data corretamente para exibir
            const dia = String(data.getDate() + 1).padStart(2, '0');
            const mes = String(data.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
            const ano = data.getFullYear();
            prop.dataFormatada = `${dia}/${mes}/${ano}`;
        
            return true;  // Mantém a proposta
        });
        propostas.sort((a, b) => {
            const dataA = new Date(a.data);
            const dataB = new Date(b.data);
        
            // Ordena primeiro pela data da proposta
            if (dataA < dataB) {
                return -1; // 'a' vem antes de 'b'
            } 
            if (dataA > dataB) {
                return 1;  // 'b' vem antes de 'a'
            }
        
            // Se as datas forem iguais, ordena pela data de criação
            const createdAtA = new Date(a.createdAt);
            const createdAtB = new Date(b.createdAt);
        
            if (createdAtA < createdAtB) {
                return -1; // 'a' vem antes de 'b'
            } 
            if (createdAtA > createdAtB) {
                return 1;  // 'b' vem antes de 'a'
            }
        
            // Se as datas de criação forem iguais, ordena pela data de atualização
            const updatedAtA = new Date(a.updatedAt);
            const updatedAtB = new Date(b.updatedAt);
        
            if (updatedAtA < updatedAtB) {
                return -1; // 'a' vem antes de 'b'
            } 
            if (updatedAtA > updatedAtB) {
                return 1;  // 'b' vem antes de 'a'
            }
        
            // Mantém a ordem se todas as comparações resultarem em empate
            return 0;
        });
        console.log(isEmpresa)
        res.render('thoughts/dashboard', {session: req.session, user,connections,propostas,isEmpresa:isEmpresa})}
        else{

            res.redirect('404')
        }

    }

    static async dashboardFail(req,res){
       
        req.session.userId = req.params.id
        console.log(req.session.userId)
        if(req.session.userId){
        const user = await User.findOne({where: {id:req.session.userId}})
        let connections
        let isEmpresa
        if(user.accountType == 'Empresa'){
            isEmpresa = true
            connections = await User.findAll({where: {accountType:'Artista'}})
        }
        else{
            isEmpresa = false
            connections = await User.findAll({where: {accountType:'Empresa'}})
        }
       let propostas = await Proposta.findAll({
            where: {
              [Op.or]: [
                { senderId: req.session.userId },
                { receiverId: req.session.userId }
              ],
              status: 'aceita'
            },
          });
        const hoje = new Date();  // Data de hoje
        propostas.forEach(async prop => {

            if(req.session.userId == prop.senderId){
            prop.empresa = await User.findOne({where: {id: prop.receiverId}})
            }
            else{
                prop.empresa = await User.findOne({where: {id: prop.senderId}})
            }
            const data = new Date(prop.data)
            if (data < hoje) {
                const newProp = {
                    id : prop.id,
                    data: prop.data,
                    hora: prop.hora,
                    local: prop.local,
                    valorHora: prop.valorHora,
                    mensagem: prop.mensagem,
                    senderId: prop.senderId,
                    receiverId: prop.receiverId,
                    status: 'expirada'
                }
                await Proposta.update(newProp,{where:{id:prop.id}})
                console.log(`Proposta inválida: ${prop.id}`);
            }
        })
        // Filtra as propostas removendo aquelas com data inválida
        propostas = propostas.filter(prop => {
            const data = new Date(prop.data);
            
            // Se a data for menor que hoje, considera inválida
            if (data < hoje) {
                return false; // Remove a proposta
            }
        
            // Formata a data corretamente para exibir
            const dia = String(data.getDate() + 1).padStart(2, '0');
            const mes = String(data.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
            const ano = data.getFullYear();
            prop.dataFormatada = `${dia}/${mes}/${ano}`;
        
            return true;  // Mantém a proposta
        });
        propostas.sort((a, b) => {
            const dataA = new Date(a.data);
            const dataB = new Date(b.data);
        
            // Ordena primeiro pela data da proposta
            if (dataA < dataB) {
                return -1; // 'a' vem antes de 'b'
            } 
            if (dataA > dataB) {
                return 1;  // 'b' vem antes de 'a'
            }
        
            // Se as datas forem iguais, ordena pela data de criação
            const createdAtA = new Date(a.createdAt);
            const createdAtB = new Date(b.createdAt);
        
            if (createdAtA < createdAtB) {
                return -1; // 'a' vem antes de 'b'
            } 
            if (createdAtA > createdAtB) {
                return 1;  // 'b' vem antes de 'a'
            }
        
            // Se as datas de criação forem iguais, ordena pela data de atualização
            const updatedAtA = new Date(a.updatedAt);
            const updatedAtB = new Date(b.updatedAt);
        
            if (updatedAtA < updatedAtB) {
                return -1; // 'a' vem antes de 'b'
            } 
            if (updatedAtA > updatedAtB) {
                return 1;  // 'b' vem antes de 'a'
            }
        
            // Mantém a ordem se todas as comparações resultarem em empate
            return 0;
        });
        res.render('thoughts/dashboard', {session: req.session, user,connections,propostas,isEmpresa:isEmpresa})}
        else{

            res.redirect('404')
        }

    }


    static async load404(req,res){
        res.render('thoughts/404', {session: req.session})
       
    }

    static async viewProfile(req,res){

        let selfView
        const id = req.session.userId
        if(req.params.id == id){
            selfView = true
        }
        else{
            selfView = false
        }
        const user = await User.findOne({where: {id:req.params.id}})
        let type
        if(user.accountType === 'Empresa'){
            type = 1
        }
        else{
            type = 0
        }
        res.render('thoughts/profile', {session: req.session,user,selfView,type,id})  
    }

    static async viewPropostaArtistaById(req,res){

        if(req.session.userId){
        const id = req.params.id
        const empresa = await User.findOne({where: {id:id}})
        const user = await User.findOne({where: {id:req.session.userId}})
        const sender = user
        const receiver = empresa
        let enderecoAllowed = false
        res.render('thoughts/proposta', {session: req.session,empresa,sender,receiver,enderecoAllowed})   
        }    
        else{
            res.render('thoughts/404', {session: req.session})
        } 
    }

    static async viewPropostaEmpresaById(req,res){

        if(req.session.userId){
        const id = req.params.id
        const empresa = await User.findOne({where: {id:req.session.userId}})
        const user = await User.findOne({where: {id:id}})
        const sender = empresa
        const receiver = user
        let enderecoAllowed = true
        res.render('thoughts/proposta', {session: req.session,empresa,sender,receiver,enderecoAllowed})
        }
        else{
            res.render('thoughts/404', {session: req.session})
        }

    }

    static async viewUserProfileById(req,res){

        const id = req.params.id
        const user = await User.findOne({where: {id:id}})
        let type
        if(user.accountType === 'Empresa'){
            type = 1
        }
        else{
            type = 0
        }
        let selfView = false
        res.render('thoughts/profile', {session: req.session,user,type,selfView})        
    }

    static async propostaPost(req,res){

        const senderId = req.params.senderId
        const receiverId = req.params.receiverId
        const proposta = {
            data: req.body.data,
            hora: req.body.hora,
            valorHora: req.body.valor,
            local: req.body.endereco,
            mensagem: req.body.mensagem,
            senderId: senderId,
            receiverId:  receiverId,
            status: 'pendente'
        }
        if(proposta.local == 'Selecione uma opção' || !proposta.data || !proposta.hora || !proposta.valorHora){
            req.flash('message', 'Selecione um endereço válido.')
                req.session.save(() => {

                    res.redirect('/thoughts/dashboard/')
                    return 
    })
        }
        else{
        const hoje = new Date()
        const data = new Date(proposta.data)
        if(data < hoje){

            req.flash('message', 'Não é possível fazer essa proposta.')
                req.session.save(() => {

                    res.redirect('/thoughts/dashboard')
                    return 
    })
        }
        else{
        console.log(proposta)
        await Proposta.create(proposta)
        req.flash('message', 'Proposta enviada com sucesso, aguardando resposta do usuário.')
                req.session.save(() => {

                    res.redirect('/thoughts/dashboard')    
    })}}
}

    static async viewPropostas(req,res){

        const id = req.session.userId
        if(req.session.userId){
        let propostasEnviadas = await Proposta.findAll({
            where: {
              senderId: req.session.userId   // senderId igual ao req.session.userId
            }
          });
        const hoje = new Date()
        for (const proposta of propostasEnviadas) {
            proposta.receiver = await User.findOne({ where: { id: proposta.receiverId } });
            // Formata a data corretamente para exibir
            const data = new Date(proposta.data)
            const dia = String(data.getDate() + 1).padStart(2, '0');
            const mes = String(data.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
            const ano = data.getFullYear();
            proposta.dataFormatada = `${dia}/${mes}/${ano}`;

        }

        let propostasRecebidas = await Proposta.findAll({ where: { receiverId: req.session.userId} });

        for (const proposta of propostasRecebidas) {
            proposta.sender = await User.findOne({ where: { id: proposta.senderId } });
            const data = new Date(proposta.data)
            const dia = String(data.getDate() + 1).padStart(2, '0');
            const mes = String(data.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
            const ano = data.getFullYear();
            proposta.dataFormatada = `${dia}/${mes}/${ano}`;
        }

        propostasEnviadas.forEach(async prop => {
            const data = new Date(prop.data)
            if (data < hoje) {
                const newProp = {
                    id : prop.id,
                    data: prop.data,
                    hora: prop.hora,
                    valorHora: prop.valorHora,
                    mensagem: prop.mensagem,
                    senderId: prop.senderId,
                    receiverId: prop.receiverId,
                    status: 'expirada'
                }
                await Proposta.update(newProp,{where:{id:prop.id}})
                console.log(`Proposta inválida: ${prop.id}`);
            }
        })

        propostasRecebidas.forEach(async prop => {
            const data = new Date(prop.data)
            if (data < hoje) {
                const newProp = {
                    id : prop.id,
                    data: prop.data,
                    hora: prop.hora,
                    valorHora: prop.valorHora,
                    mensagem: prop.mensagem,
                    senderId: prop.senderId,
                    receiverId: prop.receiverId,
                    status: 'expirada'
                }
                await Proposta.update(newProp,{where:{id:prop.id}})
                console.log(`Proposta inválida: ${prop.id}`);
            }
        })

        propostasEnviadas.sort((a, b) => {
            if (a.status === 'pendente' && b.createdAt) {
            return -1; // 'a' vem antes de 'b'
            }
            if (a.status !== 'pendente' && b.createdAt) {
            return 1;  // 'b' vem antes de 'a'
            }
            return 0;  // Mantém a ordem se ambos forem iguais
        });
        
        propostasRecebidas.sort((a, b) => {
            // Primeiro, verifica o status
            if (a.status === 'pendente' && b.status !== 'pendente') {
                return -1; // 'a' vem antes se for "pendente" e 'b' não for
            } 
            if (a.status !== 'pendente' && b.status === 'pendente') {
                return 1;  // 'b' vem antes se for "pendente" e 'a' não for
            }
        
            // Se ambos forem "pendente" ou ambos não forem, desempate pela data de criação ou atualização
            const dataA = new Date(a.updatedAt || a.createdAt);
            const dataB = new Date(b.updatedAt || b.createdAt);
            
            // Ordena da mais antiga para a mais recente
            return dataA - dataB;
        });
        

        propostasEnviadas.forEach(prop => {

            if(prop.status == 'pendente'){
                prop.aval = true 
        }
            else{
                prop.aval = false
            }
            console.log(prop.data)
        })

        propostasRecebidas.forEach(prop => {

            if(prop.status == 'pendente'){
                prop.aval = true 
        }
            else{
                prop.aval = false
            }
            console.log(prop.data)
        })

        
        res.render('thoughts/minhasPropostas', { session: req.session, propostasEnviadas, propostasRecebidas,id });
                }
                else{
                    res.redirect('404')
                }

            }

    static async aceitarProposta(req,res){

        const propostaProcurada = await Proposta.findOne({ where: { id: req.params.id } });
        const proposta = {
            id: propostaProcurada.id,
            status: 'aceita',
            data: propostaProcurada.data,
            hora: propostaProcurada.hora,
            valorHora: propostaProcurada.valorHora,
            mensagem: propostaProcurada.mensagem,
            senderId: propostaProcurada.senderId,
            receiverId: propostaProcurada.receiverId
        }
        Proposta.update(proposta,{where: {id:req.params.id}})
        req.flash('message', 'Proposta aceita com sucesso!')
        req.session.save(() => {

            res.redirect('/thoughts/dashboard')
        })

    }

    static async negarProposta(req,res){

        const propostaProcurada = await Proposta.findOne({ where: { id: req.params.id } });
        const proposta = {
            id: propostaProcurada.id,
            status: 'negada',
            data: propostaProcurada.data,
            hora: propostaProcurada.hora,
            valorHora: propostaProcurada.valorHora,
            mensagem: propostaProcurada.mensagem,
            senderId: propostaProcurada.senderId,
            receiverId: propostaProcurada.receiverId
        }
        Proposta.update(proposta,{where: {id:req.params.id}})
        if(req.session.userId){
        const user = await User.findOne({where: {id: req.session.userId}})

            req.flash('message', 'Proposta negada com sucesso!')
            req.session.save(() => {

                res.redirect(`/thoughts/dashboard`)
            })
        
    }
    else{
        res.redirect('404')
    }
    }

    static async cadastrarEndereco(req,res){

        const cep = req.body.cep
        const horaInicio = req.body.hora_abertura
        const horaFim = req.body.hora_fechamento
        const local = {}
        const apiKey = '18c0f5090b1447a3127a4ec3d2c6d486';
        try {
            const response = await fetch(`https://www.cepaberto.com/api/v3/cep?cep=${cep}`,{headers: {Authorization: `Token token=${apiKey}`}});  // ou outra função que retorna uma promessa
            const data = await response.json();
            const endereco = data.logradouro + ', ' + data.bairro + ', ' + data.cidade.nome;
            
            console.log(endereco);  // Agora 'endereco' estará definido corretamente
        
            local.endereco = endereco;
            local.horaInicio = horaInicio;
            local.horaFim = horaFim;
            local.UserId = req.session.userId   
            
            console.log(local, endereco);
            await Local.create(local);  // Aguarda o Local ser criado no banco de dados
            req.flash('message', 'Endereço cadastrado com sucesso.');
            req.session.save(() => {
                res.redirect(`/thoughts/profile/${req.session.userId}`);
            });
        } catch (error) {
            req.flash('message', 'Erro ao buscar endereço.');
            req.session.save(() => {
                res.redirect(`/thoughts/profile/${req.session.userId}`);
            });
        }
        
    }
}