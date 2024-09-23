
const User = require('../models/user')
const session = require('express-session')
const axios = require('axios')
const { use } = require('../routes/thoughtsRoutes')
const { Op, where } = require('sequelize');
const Proposta = require('../models/proposta')
const Local = require('../models/locais')
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

module.exports = class PropostaController{

    static async load404(req,res){
        res.render('thoughts/404', {session: req.session})
       
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
        const notificacoes = await Notific.findAll({where: {destinatario: user.id,status: true}})
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
        let numLembretes = notificacoes.length
        res.render('thoughts/proposta', {session: req.session,empresa,sender,receiver,enderecoAllowed,notificacoes,numLembretes})   
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
        const notificacoes = await Notific.findAll({where: {destinatario: user.id,status: true}})
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
        let numLembretes = notificacoes.length
        res.render('thoughts/proposta', {session: req.session,empresa,sender,receiver,enderecoAllowed,notificacoes,numLembretes})
        }
        else{
            res.render('thoughts/404', {session: req.session})
        }

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
            local: req.body.endereco ?? 'Selecione uma opção',
            mensagem: req.body.mensagem,
            senderId: senderId,
            receiverId: receiverId,
            status: 'pendente'
        };  
        
        const local = await Local.findOne({where: {endereco: proposta.local}})

        if (proposta.local === 'Selecione uma opção') {
            valid = false;
            msg = 'Selecione um endereço válido'
        }
        else{
        if(!(horarioAntesOuDepois(local.horaFim,proposta.horaFim) == 1 && 
        horarioAntesOuDepois(local.horaInicio,proposta.horaInicial) == -1)){
            valid = false;
            msg = 'Proposta fora do horário de funcionamento do local'

        }

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

        const notificacoes = await Notific.findAll({where: {destinatario: requester,status: true}})
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
        let numLembretes = notificacoes.length

        res.render('thoughts/minhasPropostas', { session: req.session, propostasEnviadas, propostasRecebidas,requester,notificacoes,numLembretes});
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
}