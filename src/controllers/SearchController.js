const { Op, where, col, fn } = require('sequelize');

const { User, Artist, Establishment, ServiceRequest, Tag, Rating } = require('../models/index');

module.exports = class SearchController {
    static async renderSearch(req, res) {
        const { search } = req.query;

        try {
            let userResults = [];
            let serviceResults = [];

            if (search) {
                // Busca usuários com base no campo search
                userResults = await Promise.all(
                    (await User.findAll({
                        where: {
                            [Op.or]: [
                                where(fn('LOWER', col('User.name')), {
                                    [Op.like]: `%${search.toLowerCase()}%`
                                })
                            ]
                        },
                        attributes: { exclude: ['password'] },
                        include: [{ model: Tag, as: 'Tags' }] // Inclui Tags relacionadas ao usuário
                    })).map(async (user) => {
                        const totalRatings = await Rating.count({ where: { receiverUserid: user.id } });
                        const averageRating = await Rating.findOne({
                            where: { receiverUserid: user.id },
                            attributes: [[fn('AVG', col('rate')), 'averageRating']]
                        });

                        return {
                            ...user.dataValues,
                            Tags: user.Tags.map(tag => tag.dataValues), // Inclui os dados das Tags
                            TotalRatings: totalRatings, // Total de análises recebidas
                            AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0 // Média das análises
                        };
                    })
                );

                // Busca serviços com base no campo search
                serviceResults = await Promise.all(
                    (await ServiceRequest.findAll({
                        where: {
                            [Op.or]: [
                                where(fn('LOWER', col('ServiceRequest.name')), {
                                    [Op.like]: `%${search.toLowerCase()}%`
                                })
                            ]
                        },
                        include: [
                            { model: Tag, as: 'Tags' }, // Inclui Tags com todos os atributos
                            { model: Establishment, include: [{ model: User }] } // Inclui Establishment e User
                        ]
                    })).map(async (service) => {
                        const totalRatings = await Rating.count({ where: { receiverUserid: service.Establishment.User.id } });
                        const averageRating = await Rating.findOne({
                            where: { receiverUserid: service.Establishment.User.id },
                            attributes: [[fn('AVG', col('rate')), 'averageRating']]
                        });

                        return {
                            ...service.dataValues,
                            Tags: service.Tags.map(tag => tag.dataValues), // Inclui os dados das Tags
                            Establishment: service.Establishment
                                ? {
                                    ...service.Establishment.dataValues,
                                    User: service.Establishment.User
                                        ? {
                                            ...service.Establishment.User.dataValues,
                                            TotalRatings: totalRatings, // Total de análises recebidas
                                            AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0 // Média das análises
                                        }
                                        : null
                                }
                                : null
                        };
                    })
                );
            } else {
                // Caso o campo search esteja vazio, retorna todos os usuários
                userResults = await Promise.all(
                    (await User.findAll({
                        attributes: { exclude: ['password'] },
                        include: [{ model: Tag, as: 'Tags' }] // Inclui Tags relacionadas ao usuário
                    })).map(async (user) => {
                        const totalRatings = await Rating.count({ where: { receiverUserid: user.id } });
                        const averageRating = await Rating.findOne({
                            where: { receiverUserid: user.id },
                            attributes: [[fn('AVG', col('rate')), 'averageRating']]
                        });

                        return {
                            ...user.dataValues,
                            Tags: user.Tags.map(tag => tag.dataValues), // Inclui os dados das Tags
                            TotalRatings: totalRatings, // Total de análises recebidas
                            AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0 // Média das análises
                        };
                    })
                );

                // Caso o campo search esteja vazio, retorna todos os serviços
                serviceResults = await Promise.all(
                    (await ServiceRequest.findAll({
                        include: [
                            { model: Tag, as: 'Tags' }, // Inclui Tags com todos os atributos
                            { model: Establishment, include: [{ model: User }] } // Inclui Establishment e User
                        ]
                    })).map(async (service) => {
                        const totalRatings = await Rating.count({ where: { receiverUserid: service.Establishment.User.id } });
                        const averageRating = await Rating.findOne({
                            where: { receiverUserid: service.Establishment.User.id },
                            attributes: [[fn('AVG', col('rate')), 'averageRating']]
                        });

                        return {
                            ...service.dataValues,
                            Tags: service.Tags.map(tag => tag.dataValues), // Inclui os dados das Tags
                            Establishment: service.Establishment
                                ? {
                                    ...service.Establishment.dataValues,
                                    User: service.Establishment.User
                                        ? {
                                            ...service.Establishment.User.dataValues,
                                            TotalRatings: totalRatings, // Total de análises recebidas
                                            AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0 // Média das análises
                                        }
                                        : null
                                }
                                : null
                        };
                    })
                );
            }

            // Mescla ambos os resultados
            let results = [
                ...userResults.map(result => ({
                    ...result,
                    _type: 'user'
                })),
                ...serviceResults.map(result => ({
                    ...result,
                    _type: 'service'
                }))
            ];

            // Ordena alfabeticamente pelo campo 'name'
            results = results.sort((a, b) => {
                if (!a.name) return 1;
                if (!b.name) return -1;
                return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
            });

            //console.log(results);
            return res.render('app/search', { search: search, results: results, css: 'pesquisar.css' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Erro ao realizar a busca.' });
        }
    }

    static async getFilter(req, res) {
        console.log("GET FILTER");

        const { search, type, tags } = req.query;
        const tagsid = tags ? tags.split(',').filter(Boolean).map(id => parseInt(id)) : [];

        const include = [];
        if (type === 'artista') {
            include.push({ model: Artist, required: true });
            include.push({ model: Tag, as: 'Tags', required: tagsid.length > 0, where: tagsid.length > 0 ? { id: tagsid } : undefined });
        } else if (type === 'estabelecimento') {
            include.push({ model: Establishment, required: true });
            include.push({ model: Tag, as: 'Tags', required: tagsid.length > 0, where: tagsid.length > 0 ? { id: tagsid } : undefined });
        } else if (type === 'todos') {
            include.push({ model: Artist, required: false });
            include.push({ model: Establishment, required: false });
            include.push({ model: Tag, as: 'Tags', required: tagsid.length > 0, where: tagsid.length > 0 ? { id: tagsid } : undefined });
        }

        try {
            if (search) {
                if (type === 'servico') {
                    let serviceWhere = {
                        [Op.or]: [
                            where(fn('LOWER', col('ServiceRequest.name')), {
                                [Op.like]: `%${search.toLowerCase()}%`
                            })
                        ]
                    };
                    let serviceInclude = [
                        { model: Tag, as: 'Tags', required: tagsid.length > 0, where: tagsid.length > 0 ? { id: tagsid } : undefined },
                        { model: Establishment, include: [{ model: User }] }
                    ];
                    const results = await ServiceRequest.findAll({
                        where: serviceWhere,
                        include: serviceInclude
                    });
                    const results2 = await Promise.all(
                        results.map(async (result) => {
                            const totalRatings = await Rating.count({ where: { receiverUserid: result.Establishment.User.id } });
                            const averageRating = await Rating.findOne({
                                where: { receiverUserid: result.Establishment.User.id },
                                attributes: [[fn('AVG', col('rate')), 'averageRating']]
                            });

                            return {
                                ...result.dataValues,
                                Tags: result.Tags.map(tag => tag.dataValues),
                                Establishment: result.Establishment
                                    ? {
                                        ...result.Establishment.dataValues,
                                        User: result.Establishment.User
                                            ? {
                                                ...result.Establishment.User.dataValues,
                                                TotalRatings: totalRatings, // Total de análises recebidas
                                                AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0 // Média das análises
                                            }
                                            : null
                                    }
                                    : null,
                                _type: 'service'
                            };
                        })
                    );
                    console.log(results2)
                    return res.json({ results2, search: search });
                } else if (type === 'todos') {
                    const userResults = await Promise.all(
                        (await User.findAll({
                            where: {
                                [Op.or]: [
                                    where(fn('LOWER', col('User.name')), {
                                        [Op.like]: `%${search.toLowerCase()}%`
                                    })
                                ]
                            },
                            attributes: { exclude: ['password'] },
                            include: include
                        })).map(async (user) => {
                            const totalRatings = await Rating.count({ where: { receiverUserid: user.id } });
                            const averageRating = await Rating.findOne({
                                where: { receiverUserid: user.id },
                                attributes: [[fn('AVG', col('rate')), 'averageRating']]
                            });

                            return {
                                ...user.dataValues,
                                Tags: user.Tags.map(tag => tag.dataValues),
                                TotalRatings: totalRatings,
                                AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0
                            };
                        })
                    );

                    let serviceWhere = {
                        [Op.or]: [
                            where(fn('LOWER', col('ServiceRequest.name')), {
                                [Op.like]: `%${search.toLowerCase()}%`
                            })
                        ]
                    };
                    let serviceInclude = [
                        { model: Tag, as: 'Tags', required: tagsid.length > 0, where: tagsid.length > 0 ? { id: tagsid } : undefined },
                        { model: Establishment, include: [{ model: User }] }
                    ];
                    const serviceResults = await ServiceRequest.findAll({
                        where: serviceWhere,
                        include: serviceInclude
                    });

                    let results2 = await Promise.all(
                        [
                            ...userResults.map(result => ({
                                ...result,
                                _type: 'user'
                            })),
                            ...serviceResults.map(async (result) => {
                                const totalRatings = await Rating.count({ where: { receiverUserid: result.Establishment.User.id } });
                                const averageRating = await Rating.findOne({
                                    where: { receiverUserid: result.Establishment.User.id },
                                    attributes: [[fn('AVG', col('rate')), 'averageRating']]
                            });

                            return {
                                ...result.dataValues,
                                Tags: result.Tags.map(tag => tag.dataValues),
                                Establishment: result.Establishment
                                    ? {
                                        ...result.Establishment.dataValues,
                                        User: result.Establishment.User
                                            ? {
                                                ...result.Establishment.User.dataValues,
                                                TotalRatings: totalRatings,
                                                AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0
                                            }
                                            : null
                                    }
                                    : null,
                                _type: 'service'
                            };
                        })
                ]);
                    results2 = results2.sort((a, b) => {
                        if (!a.name) return 1;
                        if (!b.name) return -1;
                        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
                    });
                    return res.json({ results2, search: search });
                }
            } else {
                if (type === 'servico') {
                    let serviceInclude = [
                        { model: Tag, as: 'Tags', required: tagsid.length > 0, where: tagsid.length > 0 ? { id: tagsid } : undefined },
                        { model: Establishment, include: [{ model: User }] }
                    ];
                    const results = await ServiceRequest.findAll({
                        include: serviceInclude
                    });
                    const results2 = await Promise.all(
                        results.map(async (result) => {
                            const totalRatings = await Rating.count({ where: { receiverUserid: result.Establishment.User.id } });
                            const averageRating = await Rating.findOne({
                                where: { receiverUserid: result.Establishment.User.id },
                                attributes: [[fn('AVG', col('rate')), 'averageRating']]
                            });

                            return {
                                ...result.dataValues,
                                Tags: result.Tags.map(tag => tag.dataValues),
                                Establishment: result.Establishment
                                    ? {
                                        ...result.Establishment.dataValues,
                                        User: result.Establishment.User
                                            ? {
                                                ...result.Establishment.User.dataValues,
                                                TotalRatings: totalRatings, // Total de análises recebidas
                                                AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0 // Média das análises
                                            }
                                            : null
                                    }
                                    : null,
                                _type: 'service'
                            };
                        })
                    );
                    console.log(results2)
                    return res.json({ results2, search: search });
                } else if (type === 'todos') {
                    const userResults = await Promise.all(
                        (await User.findAll({
                            attributes: { exclude: ['password'] },
                            include: include
                        })).map(async (user) => {
                            const totalRatings = await Rating.count({ where: { receiverUserid: user.id } });
                            const averageRating = await Rating.findOne({
                                where: { receiverUserid: user.id },
                                attributes: [[fn('AVG', col('rate')), 'averageRating']]
                            });
                
                            return {
                                ...user.dataValues,
                                Tags: user.Tags.map(tag => tag.dataValues),
                                TotalRatings: totalRatings,
                                AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0
                            };
                        })
                    );
                
                    let serviceInclude = [
                        { model: Tag, as: 'Tags', required: tagsid.length > 0, where: tagsid.length > 0 ? { id: tagsid } : undefined },
                        { model: Establishment, include: [{ model: User }] }
                    ];
                    const serviceResults = await ServiceRequest.findAll({
                        include: serviceInclude
                    });
                
                    let results2 = await Promise.all(
                        [
                            ...userResults.map(result => ({
                                ...result,
                                _type: 'user'
                            })),
                            ...serviceResults.map(async (result) => {
                                const totalRatings = await Rating.count({ where: { receiverUserid: result.Establishment.User.id } });
                                const averageRating = await Rating.findOne({
                                    where: { receiverUserid: result.Establishment.User.id },
                                    attributes: [[fn('AVG', col('rate')), 'averageRating']]
                                });
                
                                return {
                                    ...result.dataValues,
                                    Tags: result.Tags.map(tag => tag.dataValues),
                                    Establishment: result.Establishment
                                        ? {
                                            ...result.Establishment.dataValues,
                                            User: result.Establishment.User
                                                ? {
                                                    ...result.Establishment.User.dataValues,
                                                    TotalRatings: totalRatings,
                                                    AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0
                                                }
                                                : null
                                        }
                                        : null,
                                    _type: 'service'
                                };
                            })
                        ]
                    );
                
                    results2 = results2.sort((a, b) => {
                        if (!a.name) return 1;
                        if (!b.name) return -1;
                        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
                    });
                
                    return res.json({ results2, search: search });
                } else {
                    const results = await Promise.all(
                        (await User.findAll({
                            attributes: { exclude: ['password'] },
                            include: include
                        })).map(async (user) => {
                            const totalRatings = await Rating.count({ where: { receiverUserid: user.id } });
                            const averageRating = await Rating.findOne({
                                where: { receiverUserid: user.id },
                                attributes: [[fn('AVG', col('rate')), 'averageRating']]
                            });

                            return {
                                ...user.dataValues,
                                Tags: user.Tags.map(tag => tag.dataValues),
                                TotalRatings: totalRatings,
                                AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0
                            };
                        })
                    );

                    const results2 = results.map(result => ({
                        ...result,
                        _type: 'user'
                    }));
                    return res.json({ results2, search: search });
                }
            }
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: 'Erro ao realizar a busca.' });
        }
    }
};