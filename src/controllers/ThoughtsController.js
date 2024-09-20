const User = require('../models/user')
const musicalTalent = require('../models/musicalTalents')
const session = require('express-session')
const axios = require('axios')
const { use } = require('../routes/thoughtsRoutes')
const { Op, where } = require('sequelize');
const Proposta = require('../models/proposta')
const moment = require('moment');
const Local = require('../models/locais')
const Fav = require('../models/favoritos')
const Aval = require('../models/avaliacao')
const Evento = require('../models/eventos')
const Tag = require('../models/Tag')
const File = require('../models/diretorios')
const Dir = require('../models/arquivos')
const Notific = require('../models/notificacao')

function converterParaMinutos(horario) {
    if (!horario) return null; // Adicionado para lidar com valores undefined
    const [horas, minutos] = horario.split(':').map(Number);
    return horas * 60 + minutos;
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

function horarioAntesOuDepois(horario1, horario2) {

    // Converte os horários para minutos
    const minutos1 = converterParaMinutos(horario1);
    const minutos2 = converterParaMinutos(horario2);

    // Comparar os horários
    if (minutos1 < minutos2) {
        return -1;
    } else if (minutos1 > minutos2) {
        return 1;
    } else {
        return 0;
    }
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
        res.render('thoughts/dashboard', {session: req.session, user,connections,propostas,isEmpresa:isEmpresa,requester,notificacoes,numLembretes})}
        else{

            res.redirect('404')
        }

    }


    static async load404(req,res){
        res.render('thoughts/404', {session: req.session})
       
    }

    static async viewProfile(req,res){

        const id = req.params.id
        req.session.userId = id
        if(req.session.userId){
        let selfView = true
        const id = req.session.userId
        const locais = await Local.findAll({where:{UserId:id}})
        const eventos = await Evento.findAll({where: {owner: id}})
        const user = await User.findOne({where: {id:id}})
        const tags = await Tag.findAll({where: {UserId: id}})
        let hasTags = true
        if(!tags){
            hasTags = false
        }
        const avaliacoes = await Aval.findAll({where: {avaliado: id}})
        tags.forEach(async tag => {

            tag.talent = await musicalTalent.findOne({where: {id:tag.codMusicalTalent}})
            if(tag.talent.categoria == 'Instrumento'){
                tag.instrumento = true
            }
            else{
                tag.talent.instrumento = false
            }

            if(tag.talent.categoria == 'Gênero Musical'){
                tag.genero = true
            }
            else{
                tag.genero = false
            }
        })
        let media = 0
        if(avaliacoes.length > 0){
            
            avaliacoes.forEach(aval => {

                media += aval.nota
            })
            media = media / avaliacoes.length
        }
        let porcentagem = media / 5 * 100
        let type
        if(user.accountType === 'Empresa'){
            type = 1
        }
        else{
            type = 0
        }
        res.render('thoughts/profile', {session: req.session,user,selfView,type,id,locais, media,porcentagem,eventos,tags,hasTags})
        }
        else{
            res.redirect('404')
        }  
    }

    static async viewAvaliacoes(req,res){

        req.session.userId = req.params.id
        if(req.session.userId){
        const id = req.params.id
        const requesterId = req.params.requester
        const avaliacoes = await Aval.findAll({where: {avaliado: id}})
        avaliacoes.forEach(async aval => {
            aval.perfil = await User.findOne({where: {id: aval.avaliador}})
            const data = new Date(aval.createdAt)
            const dia = String(data.getDate() ).padStart(2, '0');
            const mes = String(data.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
            const ano = data.getFullYear();
            aval.data = `${dia}/${mes}/${ano}`;
            aval.requesterId = requesterId
        })
        avaliacoes.sort((a, b) => {
            
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

        res.render('thoughts/avaliacoes', {session: req.session,id,requesterId,avaliacoes})
        }
        else{
            res.redirect('404')
        }  
    }

    static async viewPropostaArtistaById(req,res){

        req.session.userId = req.params.requester
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

        req.session.userId = req.params.requester
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

        req.session.userId = req.params.requester
        let searched = req.params.id
        const id = req.params.requester
        let selfView = false
        if(id == searched){
            selfView = true
        }
        const user = await User.findOne({where: {id:searched}})
        const eventos = await Evento.findAll({where: {owner: searched}})
        let type
        const locais = await Local.findAll({where:{UserId:searched}})
        const tags = await Tag.findAll({where: {UserId: searched}})
        let hasTags = true
        if(!tags){
            hasTags = false
        }
        const avaliacoes = await Aval.findAll({where: {avaliado: searched}})
        tags.forEach(async tag => {

            tag.talent = await musicalTalent.findOne({where: {id:tag.codMusicalTalent}})
            if(tag.talent.categoria == 'Instrumento'){
                tag.instrumento = true
            }
            else{
                tag.talent.instrumento = false
            }

            if(tag.talent.categoria == 'Gênero Musical'){
                tag.genero = true
            }
            else{
                tag.genero = false
            }
        })
        let media = 0
        if(avaliacoes.length > 0){
            
            avaliacoes.forEach(aval => {

                media += aval.nota
            })
            media = media / avaliacoes.length
        }
        let porcentagem = media / 5 * 100
        if(user.accountType === 'Empresa'){
            type = 1
        }
        else{
            type = 0
        }
        res.render('thoughts/profile', {session: req.session,user,type,selfView,locais,id,media,porcentagem,eventos,tags,hasTags})        
    }

    static async propostaPost(req, res) {

        req.session.userId = req.params.senderId
        const senderId = req.params.senderId;
        const receiverId = req.params.receiverId;
        const propostas = await Proposta.findAll({ where: { [Op.or]: [
            { senderId: senderId },
            { senderId: receiverId },
            { receiverId: senderId },
            { receiverId: receiverId },
        ], status: 'aceita' } });
        let valid = true;
        let msg = ''
    
        const proposta = {
            data: req.body.data,
            horaInicial: req.body.horaInicial + ':00',
            horaFim: req.body.horaFim + ':00',
            valorHora: req.body.valor,
            local: req.body.endereco,
            mensagem: req.body.mensagem,
            senderId: senderId,
            receiverId: receiverId,
            status: 'pendente'
        };  
        
        const local = await Local.findOne({where: {endereco: proposta.local}})

        if(!(horarioAntesOuDepois(local.horaFim,proposta.horaFim) == 1 && 
        horarioAntesOuDepois(local.horaInicio,proposta.horaInicial) == -1)){
            valid = false;
            msg = 'Proposta fora do horário de funcionamento do local'

        }

        if (proposta.local === 'Selecione uma opção') {
            valid = false;
            msg = 'Selecione um endereço válido'
        }
    
        const hoje = new Date();
        const data = new Date(proposta.data);
        data.setDate(data.getDate() + 1)
        const [horaInicial, minutoInicial] = proposta.horaInicial.split(':');
        data.setHours(horaInicial, minutoInicial);

        try {
            if (horarioAntesOuDepois(proposta.horaInicial, proposta.horaFim) == 1 || horarioAntesOuDepois(proposta.horaInicial, proposta.horaFim) == 0) {
                valid = false;
                msg = 'O horário inicial não pode ser posterior ou igual ao final'
            }
        } catch (error) {
            console.error('Erro ao comparar horários:', error);
            valid = false;
            msg = 'O horário inicial não pode ser posterior ou igual ao final'
        }

        const cobaia = new Date(proposta.data)
        propostas.forEach(prop => {
            try {
                // Garantindo que horaInicial e horaFim estão como strings
                const horaFimProp = prop.horaFim ? prop.horaFim.toString() : null;
                const horaInicialProposta = proposta.horaInicial ? proposta.horaInicial.toString() : null;
        
                if (isSameDay(new Date(prop.data), new Date(proposta.data)) &&
                    horaFimProp && horaInicialProposta &&  // Certifique-se de que ambos os horários existem
                    !(horarioAntesOuDepois(horaFimProp, horaInicialProposta) === -1 || 
                    (horarioAntesOuDepois(horaFimProp, horaInicialProposta) === 1 && 
                    horarioAntesOuDepois(prop.horaInicial, proposta.horaFim) === 1))) {
                    
                    valid = false;
                    msg = 'Horário selecionado já está agendado';
                }
            } catch (error) {
                console.error('Erro ao comparar propostas:', error);
            }
        });
    
        if (data < hoje) {

            valid = false;
            msg = 'Não é possível agendar para datas passadas'
        }
    
        req.flash('message', '');
        if (!valid) {
            req.flash('message', msg);
            req.session.save(() => {
                res.redirect(`/thoughts/dashboard/${senderId}`);
            });
        } else {

            const sender = await User.findOne({where: {id: senderId}})
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0'); // Horas no formato 00-23
            const minutes = now.getMinutes().toString().padStart(2, '0'); // Minutos no formato 00-59
            const seconds = now.getSeconds().toString().padStart(2, '0'); // Segundos no formato 00-59

            const currentTime = `${hours}:${minutes}:${seconds}`;
            const notificacao = {
                conteudo: `Você recebeu uma nova proposta de ${sender.name} - ${currentTime}`,
                categoria: 'proposta',
                status: true,
                remetente: senderId,
                destinatario: receiverId,
            }
            await Notific.create(notificacao);
            await Proposta.create(proposta);
            req.flash('message', 'Proposta enviada com sucesso, aguardando resposta do usuário');
            req.session.save(() => {
                res.redirect(`/thoughts/dashboard/${senderId}`);
            });
        }
    }
    

    static async viewPropostas(req,res){

        req.session.userId = req.params.id
        const id = req.session.userId
        const requester = id
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
            const horaInicialProposta = prop.horaInicial ? prop.horaInicial.toString() : null;
            const horaHoje = hoje ? hoje.toString() : null;
            const data = new Date(prop.data)
            if(data.getFullYear() ==hoje.getFullYear() &&
            data.getMonth() == hoje.getMonth() &&
            data.getDate() + 1 == hoje.getDate() && prop.status != 'concluída' && prop.status != 'expirada' && horarioAntesOuDepois(horaInicialProposta, horaHoje.split(' ')[4]) == -1)
            {

                const receiver = await User.findOne({where: {id: prop.receiverId}})
                const now = new Date();
                const hours = now.getHours().toString().padStart(2, '0'); // Horas no formato 00-23
                const minutes = now.getMinutes().toString().padStart(2, '0'); // Minutos no formato 00-59
                const seconds = now.getSeconds().toString().padStart(2, '0'); // Segundos no formato 00-59
    
                const currentTime = `${hours}:${minutes}:${seconds}`;
                let notificacao = {
                    conteudo: `Sua proposta para ${receiver.name} expirou - ${currentTime}`,
                    categoria: 'proposta',
                    status: true,
                    remetente: prop.receiverId,
                    destinatario: prop.senderId,
                }
                await Notific.create(notificacao)

                const sender = await User.findOne({where: {id: prop.senderId}})
            
             notificacao = {
                conteudo: `Você não respondeu à proposta de ${sender.name} a tempo - ${currentTime}`,
                categoria: 'proposta',
                status: true,
                remetente: prop.senderId,
                destinatario: prop.receiverId,
            }

            await Notific.create(notificacao)

            const newProp = {
                id : prop.id,
                data: prop.data,
                horaInicial: prop.horaInicial,
                horaFim: prop.horaFim,
                valorHora: prop.valorHora,
                mensagem: prop.mensagem,
                senderId: prop.senderId,
                receiverId: prop.receiverId,
                status: 'expirada'
            }
            await Proposta.update(newProp,{where:{id:prop.id}})
        }
        })

        propostasRecebidas.forEach(async prop => {
    
            const horaInicialProposta = prop.horaInicial ? prop.horaInicial.toString() : null;
            const horaHoje = hoje ? hoje.toString() : null;
            const data = new Date(prop.data)
            if(data.getFullYear() ==hoje.getFullYear() &&
            data.getMonth() == hoje.getMonth() &&
            data.getDate() + 1 == hoje.getDate() && prop.status != 'concluída' && prop.status != 'expirada' && horarioAntesOuDepois(horaInicialProposta, horaHoje.split(' ')[4]) == -1)
            {
                const receiver = await User.findOne({where: {id: prop.receiverId}})
                const now = new Date();
                const hours = now.getHours().toString().padStart(2, '0'); // Horas no formato 00-23
                const minutes = now.getMinutes().toString().padStart(2, '0'); // Minutos no formato 00-59
                const seconds = now.getSeconds().toString().padStart(2, '0'); // Segundos no formato 00-59
    
                const currentTime = `${hours}:${minutes}:${seconds}`;
                let notificacao = {
                    conteudo: `Sua proposta para ${receiver.name} expirou - ${currentTime}`,
                    categoria: 'proposta',
                    status: true,
                    remetente: prop.receiverId,
                    destinatario: prop.senderId,
                }
                await Notific.create(notificacao)

                const sender = await User.findOne({where: {id: prop.senderId}})
            
             notificacao = {
                conteudo: `Você não respondeu à proposta de ${sender.name} a tempo - ${currentTime}`,
                categoria: 'proposta',
                status: true,
                remetente: prop.senderId,
                destinatario: prop.receiverId,
            }

            await Notific.create(notificacao)
            const newProp = {
                id : prop.id,
                data: prop.data,
                horaInicial: prop.horaInicial,
                horaFim: prop.horaFim,
                valorHora: prop.valorHora,
                mensagem: prop.mensagem,
                senderId: prop.senderId,
                receiverId: prop.receiverId,
                status: 'expirada'
            }
            await Proposta.update(newProp,{where:{id:prop.id}})
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
        })

        propostasRecebidas.forEach(prop => {

            if(prop.status == 'pendente'){
                prop.aval = true 
        }
            else{
                prop.aval = false
            }
            prop.requester = requester
        })

        
        res.render('thoughts/minhasPropostas', { session: req.session, propostasEnviadas, propostasRecebidas,requester});
                }
                else{
                    res.redirect('404')
                }

            }

            static async openNotificationPropostas(req, res) {

                    // Captura o ID do usuário a partir dos parâmetros da requisição
                    req.session.userId = req.params.id;
                    const id = req.params.id;
                    const notific = req.params.notific
                    
                    // Certifica-se de que existe pelo menos uma notificação
                        // Atualiza o status da notificação para `false`
                        await Notific.update({ status: false }, { where: { id: notific} });
            
                        // Redireciona o usuário
                        res.redirect(`/thoughts/propostas/${id}`);
            }
            

    static async aceitarProposta(req,res){

        req.session.userId = req.params.requester
        const requester = req.params.requester
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
        req.flash('message', '');
        req.flash('message', 'Proposta aceita com sucesso!')
        req.session.save(() => {

            res.redirect(`/thoughts/dashboard/${requester}`)
        })

    }

    

    static async negarProposta(req,res){

        req.session.userId = req.params.requester
        const requester = req.params.requester
        const propostaProcurada = await Proposta.findOne({ where: { id: req.params.id } });
        const receiver = await User.findOne({where: {id: requester}})
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0'); // Horas no formato 00-23
            const minutes = now.getMinutes().toString().padStart(2, '0'); // Minutos no formato 00-59
            const seconds = now.getSeconds().toString().padStart(2, '0'); // Segundos no formato 00-59

            const currentTime = `${hours}:${minutes}:${seconds}`;
            const notificacao = {
                conteudo: `Sua proposta para ${receiver.name} foi negada - ${currentTime}`,
                categoria: 'proposta',
                status: true,
                remetente: requester,
                destinatario: propostaProcurada.senderId,
            }
            await Notific.create(notificacao)

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

            req.flash('message', '');
            req.flash('message', 'Proposta negada com sucesso!')
            req.session.save(() => {

                res.redirect(`/thoughts/dashboard/${requester}`)
            })
        
    }
    else{
        res.redirect('404')
    }
    }

    static async cadastrarEndereco(req,res){

        if(req.session.userId){
        const cep = req.body.cep
        const horaInicial = req.body.hora_abertura
        const horaFim = req.body.hora_fechamento
        const local = {}
        const apiKey = '18c0f5090b1447a3127a4ec3d2c6d486';
        try {
            const response = await fetch(`https://www.cepaberto.com/api/v3/cep?cep=${cep}`,{headers: {Authorization: `Token token=${apiKey}`}});  // ou outra função que retorna uma promessa
            const data = await response.json();
            const endereco = data.logradouro + ', ' + data.bairro + ', ' + data.cidade.nome;
        
            local.endereco = endereco;
            local.horaInicial = horaInicial;
            local.horaFim = horaFim;
            local.UserId = req.session.userId   
            
            await Local.create(local);  // Aguarda o Local ser criado no banco de dados
            req.flash('message', '');
            req.flash('message', 'Endereço cadastrado com sucesso');
            req.session.save(() => {
                res.redirect(`/thoughts/profile/${req.session.userId}/${req.session.userId}`);
            });
        } catch (error) {
            req.flash('message', 'Erro ao buscar endereço');
            req.session.save(() => {
                res.redirect(`/thoughts/profile/${req.session.userId}/${req.session.userId}`);
            });
        }
    }
    else{
        res.redirect('404')
    }
        
    }

    static async favoritar(req,res){

        req.session.userId = req.params.detentor
        if(req.session.userId){
        
            const detentor = req.params.detentor
            const detido = req.params.detido
            const fav = await Fav.findOne({where: {detentor:detentor,detido:detido}})
            if(fav){
                req.flash('message','')
            req.flash('message','Perfil já adicionado aos favoritos')
            req.session.save(() => {
                res.redirect(`/thoughts/profile/${detido}/${detentor}`);
            });
            }
            else{
                const favorito = {
                    detentor: detentor,
                    detido: detido,
                }
                await Fav.create(favorito)
                req.flash('message','')
                req.flash('message','Perfil adicionado aos favoritos')
                req.session.save(() => {
                    res.redirect(`/thoughts/profile/${detido}/${detentor}`);
                });
            }
    }
    else{
        res.redirect('404')
    }
        
    }

    static async exibirFavoritos(req,res){

        req.session.userId = req.params.detentor
        if(req.session.userId){
        
            const detentor = req.params.detentor
            const favoritos = await Fav.findAll({where: {detentor:detentor}})
            favoritos.forEach(async fav => {

                fav.user = await User.findOne({ where: {id: fav.detido}})
            })
            res.render(`thoughts/favoritos`, {session: req.session, favoritos,detentor});
    }
    else{
        res.redirect('404')
    }
        
    }

    static async avaliar(req,res){

        req.session.userId = req.params.avaliador
        if(req.session.userId){
        
            const avaliador = req.params.avaliador
            const avaliado = req.params.avaliado
            let valid = true
            let msg
            if (req.body.servico === 'Selecione uma opção') {
                
                valid = false
                msg = 'Selecione um serviço válido'
            }
            else{
                const conteudo = req.body.conteudo
                const nota = req.body.nota
                const detalhesServico = req.body.servico.split(';')
                const servico = await Proposta.findOne({where: {senderId: detalhesServico[0], receiverId: detalhesServico[1], horaInicial: detalhesServico[2], data: detalhesServico[5]}})
                const avaliacao = {
                    conteudo: conteudo,
                    nota: nota,
                    servico: servico.id,
                    avaliador: avaliador,
                    avaliado: avaliado
                }
                const avalExists = await Aval.findOne({where: {servico: servico.id,avaliador: avaliador}})
                if(avalExists){

                    valid = false
                    msg = "Já existe uma avaliação registrada para este servço"
                }
                if(valid){
                await Aval.create(avaliacao)
                    req.flash('message','')
                    req.flash('message','Avaliação Enviada com sucesso!')
                    req.session.save(() => {
                        res.redirect(`/thoughts/profile/${avaliado}/${avaliador}`);
                    });
                }
                else{

                    req.flash('message','')
                    req.flash('message',msg)
                    req.session.save(() => {
                    res.redirect(`/thoughts/profile/${avaliado}/${avaliador}`);
                });
                }
    
            }            
        }
    else{
        res.redirect('404')
    }
        
    }

    static async cadastrarEvento(req, res) {

        req.session.userId = req.params.id
        const id = req.params.id;

        const eventoExists = false

        if(eventoExists || !req.file){
            
            req.flash('message', 'Evento já cadastrado!');
            req.session.save(() => {
                res.redirect(`/thoughts/profile/${id}/${id}`);
            });
        }
        else{
            
            const evento = {
                data: req.body.data,
                horaInicial: req.body.horaInicial + ':00',
                horaFim: req.body.horaFim + ':00',
                local: req.body.endereco,
                img: req.file.filename,
                nome: req.body.nome,
                descricao: req.body.descricao,
                owner: id
            };  
        
            await Evento.create(evento)
            req.flash('message','')
            req.flash('message', 'Evento cadastrado com sucesso!');
            req.session.save(() => {
                res.redirect(`/thoughts/profile/${id}/${id}`);
            });
        }
    }

    static async cadastrarTag(req, res) {

        req.session.userId = req.params.id
        const instrumentosCorda = await musicalTalent.findAll({where: {categoria:'Instrumento',subtipo:'Corda'}})
        const instrumentosSopro = await musicalTalent.findAll({where: {categoria:'Instrumento',subtipo:'Sopro'}})
        const instrumentosPercussao = await musicalTalent.findAll({where: {categoria:'Instrumento',subtipo:'Percussão'}})
        const generos = await musicalTalent.findAll({where: {categoria:'Gênero Musical'}})
        const profissoes = await musicalTalent.findAll({where: {categoria:'Profissão'}})
        res.render('thoughts/tags',{sesssion: req.session, instrumentosCorda, instrumentosSopro, instrumentosPercussao, generos, profissoes})
    }

    static async cadastrarTagPost(req, res) {

        req.session.userId = req.params.id
        const selectedTalents = req.body.musicalTalents;
        
        await Tag.destroy({where: {UserId: req.session.userId}})
        
        selectedTalents.forEach(async talent => {

            const talentSpec = await musicalTalent.findOne({where: {descricao: talent}})
            const tagExists = await Tag.findOne({where: {UserId: req.session.userId,codMusicalTalent: talentSpec.id}})
            if(!tagExists){
                const tag = {UserId: req.session.userId, codMusicalTalent: talentSpec.id}
                await Tag.create(tag);
            }

        })
        req.flash('message','')
        req.flash('message', 'Talento cadastrado com sucesso!');
            req.session.save(() => {
                res.redirect(`/thoughts/profile/${req.session.userId}/${req.session.userId}`);
            });
    }

    static async criarPasta(req, res) {

        req.session.userId = req.params.id
        const dir = {
            nome: req.body.nome,
            owner: req.session.userId,
        }
        
        const dirExists = await File.findOne({where: {nome: dir.nome,owner: dir.owner}})
        
        if(dirExists){

            req.flash('message','')
            req.flash('message', 'Esta pasta já existe!');
                req.session.save(() => {
                    res.redirect(`/thoughts/profile/${req.session.userId}/${req.session.userId}`);
                });
        }
        else{

            await File.create(dir);

            req.flash('message','')
            req.flash('message', 'Pasta criada com sucesso!');
                req.session.save(() => {
                    res.redirect(`/thoughts/profile/${req.session.userId}/${req.session.userId}`);
                });
        }
        
    }
      
    static async userEdit(req,res){

        const id = req.params.id
        req.session.userId = id
        const user = await User.findOne({where: {id: id}})
        res.render('thoughts/userEdit',{session: req.session, id, user})
    }

    static async userEditPost(req,res){
        const id = req.params.id
        req.session.userId = id
        const user = await User.findOne({where: {id: id}})
        let {name, descricao, state, city} = req.body
        if(state == 'Selecione um Estado'){
            state = user.state
            city = user.city
        }
        let imageUrl
        if(req.file){
            imageUrl = `/uploads/${req.file.filename}`;
        }
        else{
            imageUrl = user.img
        }
        const userUpdate = {

            name,
            img: imageUrl,
            description: descricao,
            state,
            city
        }
        try{
            await User.update(userUpdate,{where:{id:id}})
            req.flash('message', '')
            req.flash('message', 'Atualização realizada com sucesso!')
            req.session.save(() => {

                res.redirect(`/thoughts/profile/${id}/${id}`)
            })
        }
        catch(err){
            console.log(err)
        }
    }

}