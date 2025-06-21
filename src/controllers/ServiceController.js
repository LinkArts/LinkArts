const { Op, where, col, fn } = require('sequelize');
const User = require('../models/User');
const Service = require('../models/Service');
const ServiceProposal = require('../models/ServiceProposal');
const Tag = require('../models/Tag');
const { Artist, Establishment } = require('../models');

module.exports = class ServiceController
{
    static async showService(req, res)
    {
        try {
            const serviceId = req.params.id;

            const service = await Service.findOne({
                where: { id: serviceId },
                include: [
                    {
                        model: User,
                        as: 'Receiver',
                        include: [
                            {
                                model: Artist,
                                required: false
                            },
                            {
                                model: Establishment,
                                required: false
                            }
                        ]
                    },
                    {
                        model: User,
                        as: 'Sender',
                        include: [
                            {
                                model: Artist,
                                required: false
                            },
                            {
                                model: Establishment,
                                required: false
                            }
                        ]
                    },
                    {
                        model: Tag,
                        as: 'Tags',
                        through: { attributes: [] }
                    }
                ]
            });

            if (!service) {
                return res.status(404).render('layouts/404', { 
                    message: 'Serviço não encontrado',
                });
            }

            const formattedService = {
                id: service.id,
                title: service.name,
                type: service.Tags.map(tag => tag.name).join(', '),
                description: service.description,
                date: new Date(service.date).toLocaleDateString('pt-BR'),
                budget: parseFloat(service.price),
                status: service.status || 'Pendente',
                requester: {
                    id: service.Receiver.id,
                    name: service.Receiver.name,
                    email: service.Receiver.email,
                    location: `${service.Receiver.city}, ${service.Receiver.state}`,
                    profileImg: service.Receiver.profileImg || `https://via.placeholder.com/100/9b87f5/ffffff?text=${service.Receiver.name.charAt(0)}`
                },
                provider: {
                    id: service.Sender.id,
                    name: service.Sender.name,
                    email: service.Sender.email,
                    location: `${service.Sender.city}, ${service.Sender.state}`,
                    profileImg: service.Sender.profileImg || `https://via.placeholder.com/100/6D28D9/ffffff?text=${service.Sender.name.charAt(0)}`
                },
                isRequesterConfirmed: service.requesterConfirmed || false,
                isProviderConfirmed: service.providerConfirmed || false,
                hasBeenReviewed: service.reviewed || false
            };

            return res.render('app/service', { 
                css: 'servico.css',
                service: formattedService
            });
        } catch (error) {
            console.error('Erro ao buscar serviço:', error);
            return res.status(500).render('error', { 
                message: 'Erro ao carregar serviço',
                css: 'error.css'
            });
        }
    }
}