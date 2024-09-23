const User = require('../models/user')
const session = require('express-session')
const axios = require('axios')
const { use } = require('../routes/thoughtsRoutes')
const { Op, where } = require('sequelize');
const Proposta = require('../models/proposta')
const moment = require('moment');
const Aval = require('../models/avaliacao')
const Notific = require('../models/notificacao')
const Mensagem = require("../models/mensagem")

function converterParaMinutos(horario) {
    if (!horario) return null; // Adicionado para lidar com valores undefined
    const [horas, minutos] = horario.split(':').map(Number);
    return horas * 60 + minutos;
}

function calcularDiferencaHoras(horarioInicial, horarioFinal) {

    // Converte os horários para minutos
    const minutosInicial = converterParaMinutos(horarioInicial);
    const minutosFinal = converterParaMinutos(horarioFinal);

    // Calcula a diferença em minutos
    const diferencaMinutos = minutosFinal - minutosInicial;

    // Converte a diferença para horas
    const diferencaHoras = diferencaMinutos / 60;

    return diferencaHoras;
}

module.exports = class ThoughtController{

    static async dashboard(req,res){
       
        req.session.userId = req.params.id
        if(req.session.userId){
        const requester = req.session.userId
        const user = await User.findOne({where: {id:req.session.userId}})
        const notificacoes = await Notific.findAll({where: {destinatario: user.id,status: true}})
        const mensagem = await Mensagem.findAll({where: {visto: false, destinatario: requester}})
        const nVisto = mensagem.length
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
        for(let notific of notificacoes) {
            if(notific.categoria == 'proposta'){
            notific.link = `/thoughts/viewPropostas/${user.id}/${notific.id}`
        }
    }
    notificacoes.sort((a, b) => {
            
        const createdAtA = new Date(a.createdAt);
        const createdAtB = new Date(b.createdAt);
    
        if (createdAtA < createdAtB) {
            return 1; // 'a' vem antes de 'b'
        } 
        if (createdAtA > createdAtB) {
            return -1;  // 'b' vem antes de 'a'
        }
    
        // Se as datas de criação forem iguais, ordena pela data de atualização
        const updatedAtA = new Date(a.updatedAt);
        const updatedAtB = new Date(b.updatedAt);
    
        if (updatedAtA < updatedAtB) {
            return 1; // 'a' vem antes de 'b'
        } 
        if (updatedAtA > updatedAtB) {
            return -1;  // 'b' vem antes de 'a'
        }
    
        // Mantém a ordem se todas as comparações resultarem em empate
        return 0;
    });

        connections.forEach(async conn => {

            conn.requester = requester
            const avaliacoes = await Aval.findAll({where: {avaliado: conn.id}})
            let media = 0
        if(avaliacoes.length > 0){
            
            avaliacoes.forEach(aval => {

                media += aval.nota
            })
            media = media / avaliacoes.length
        }
            let porcentagem = media / 5 * 100
            conn.media = media
            conn.porcentagem = porcentagem
        })
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
            const hoje = new Date();  // Data e hora atuais

            // Converte a data e a hora da proposta para um objeto Date completo
            const dataProposta = new Date(prop.data);  // A data da proposta
            dataProposta.setDate(dataProposta.getDate() + 1)
            const [horaInicial, minutoInicial] = prop.horaInicial.split(':');  // Divide a hora em horas e minutos
            
            // Define a hora e minuto da proposta
            dataProposta.setHours(horaInicial, minutoInicial);

            // Verifica se a data e hora da proposta já passou

            if (dataProposta < hoje) {
                const newProp = {
                    id: prop.id,
                    data: prop.data,
                    horaInicial: prop.horaInicial,
                    horaFim: prop.horaFim,
                    local: prop.local,
                    valorHora: prop.valorHora,
                    mensagem: prop.mensagem,
                    senderId: prop.senderId,
                    receiverId: prop.receiverId,
                    status: 'concluída'
                };
                await Proposta.update(newProp, { where: { id: prop.id } });
            }
        });
        // Filtra as propostas removendo aquelas com data inválida
        propostas = propostas.filter(prop => {
            const data = new Date(prop.data);
            data.setDate(data.getDate() + 1)
            
            // Se a data for menor que hoje, considera inválida
            if (data < hoje) {
                return false; // Remove a proposta
            }
        
            // Formata a data corretamente para exibir
            const dia = String(data.getDate()).padStart(2, '0');
            const mes = String(data.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
            const ano = data.getFullYear();
            prop.dataFormatada = `${dia}/${mes}/${ano}`;

            const dif = calcularDiferencaHoras(prop.horaInicial,prop.horaFim)
            prop.valorFinal = Math.round(dif * prop.valorHora * 100)/100
        
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
        let numLembretes = notificacoes.length
        res.render('thoughts/dashboard', {session: req.session, user,connections,propostas,isEmpresa:isEmpresa,requester,notificacoes,numLembretes,nVisto})}
        else{

            res.redirect('404')
        }

    }


    static async load404(req,res){
        res.render('thoughts/404', {session: req.session})
       
    }

}