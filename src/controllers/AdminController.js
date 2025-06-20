const { Op, where, col, fn } = require('sequelize');
const User = require('../models/User');
const Artist = require('../models/Artist');
const Establishment = require('../models/Establishment');

module.exports = class AdminController
{
    static async showAdmin(req, res)
    {
        return res.render('app/admin', { css: 'admin.css' })
    }

    static async getUserStats(req, res)
    {
        try {
            const totalArtists = await Artist.count();

            const totalEstablishments = await Establishment.count();

            const totalGeneralUsers = await User.count({
                include: [
                    {
                        model: Artist,
                        required: false,
                        where: {
                            '$Artist.cpf$': null
                        }
                    },
                    {
                        model: Establishment,
                        required: false,
                        where: {
                            '$Establishment.cnpj$': null
                        }
                    }
                ],
                where: {
                    [Op.and]: [
                        { '$Artist.cpf$': null },
                        { '$Establishment.cnpj$': null }
                    ]
                }
            });

            const totalUsers = totalArtists + totalEstablishments + totalGeneralUsers;

            return res.json({
                artists: totalArtists,
                establishments: totalEstablishments,
                general: totalGeneralUsers,
                total: totalUsers
            });
        } catch (error) {
            console.error('Erro ao buscar estatísticas de usuários:', error);
            return res.status(500).json({ error: 'Erro ao buscar estatísticas de usuários' });
        }
    }
}