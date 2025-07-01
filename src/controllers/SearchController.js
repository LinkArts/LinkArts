const { Op, where, col, fn } = require('sequelize');

const { User, Artist, Establishment, ServiceRequest, Tag, Rating } = require('../models/index');

module.exports = class SearchController
{
    static async renderSearch(req, res)
    {
        const { search } = req.query;
        const loggedUserId = req.session.userid;

        // Descobre se é artista logado
        let isArtist = null;
        if (loggedUserId)
        {
            isArtist = await Artist.findOne({ where: { userid: loggedUserId } });
        }

        try
        {
            let userResults = [];
            let serviceResults = [];

            if (search)
            {
                // Busca usuários com base no campo search
                userResults = await Promise.all(
                    (await User.findAll({
                        where: {
                            [Op.or]: [
                                where(fn('LOWER', col('User.name')), {
                                    [Op.like]: `%${ search.toLowerCase() }%`
                                })
                            ],
                            isAdmin: false
                        },
                        attributes: { exclude: ['password'] },
                        include: [{ model: Tag, as: 'Tags' }, { model: Artist, required: false }]
                    })).map(async (user) =>
                    {
                        const totalRatings = await Rating.count({ where: { receiverUserid: user.id } });
                        const averageRating = await Rating.findOne({
                            where: { receiverUserid: user.id },
                            attributes: [[fn('AVG', col('rate')), 'averageRating']]
                        });

                        // Detecta se é artista ou estabelecimento
                        let isArtistUser = user.dataValues.Artist ? true : false;

                        return {
                            ...user.dataValues,
                            Tags: user.Tags ? user.Tags.map(tag => tag.dataValues) : [],
                            TotalRatings: totalRatings,
                            AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0,
                            isArtist: isArtistUser,
                            _type: 'user'
                        };
                    })
                );

                // Busca serviços com base no campo search
                serviceResults = await Promise.all(
                    (await ServiceRequest.findAll({
                        where: {
                            [Op.or]: [
                                where(fn('LOWER', col('ServiceRequest.name')), {
                                    [Op.like]: `%${ search.toLowerCase() }%`
                                })
                            ]
                        },
                        include: [
                            { model: Tag, as: 'Tags' },
                            { model: Establishment, include: [{ model: User }] }
                        ]
                    })).map(async (service) =>
                    {
                        const totalRatings = await Rating.count({ where: { receiverUserid: service.Establishment.User.id } });
                        const averageRating = await Rating.findOne({
                            where: { receiverUserid: service.Establishment.User.id },
                            attributes: [[fn('AVG', col('rate')), 'averageRating']]
                        });

                        // Checa se o artista logado está interessado
                        let isInterested = false;
                        if (isArtist && typeof service.hasArtist === 'function')
                        {
                            isInterested = await service.hasArtist(isArtist);
                        }

                        return {
                            ...service.dataValues,
                            Tags: service.Tags.map(tag => tag.dataValues),
                            Establishment: service.Establishment
                                ? {
                                    ...service.Establishment.dataValues,
                                    User: service.Establishment.User
                                        ? {
                                            ...service.Establishment.User.dataValues,
                                            TotalRatings: totalRatings,
                                            AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0
                                        }
                                        : null
                                }
                                : null,
                            isInterested
                        };
                    })
                );
            } else
            {
                // Caso o campo search esteja vazio, retorna todos os usuários
                userResults = await Promise.all(
                    (await User.findAll({
                        where: {isAdmin: false},
                        attributes: { exclude: ['password'] },
                        include: [{ model: Tag, as: 'Tags' }, { model: Artist, required: false }]
                    })).map(async (user) =>
                    {
                        const totalRatings = await Rating.count({ where: { receiverUserid: user.id } });
                        const averageRating = await Rating.findOne({
                            where: { receiverUserid: user.id },
                            attributes: [[fn('AVG', col('rate')), 'averageRating']]
                        });

                        let isArtistUser = user.dataValues.Artist ? true : false;

                        return {
                            ...user.dataValues,
                            Tags: user.Tags.map(tag => tag.dataValues),
                            TotalRatings: totalRatings,
                            AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0,
                            isArtist: isArtistUser
                        };
                    })
                );

                // Caso o campo search esteja vazio, retorna todos os serviços
                serviceResults = await Promise.all(
                    (await ServiceRequest.findAll({
                        include: [
                            { model: Tag, as: 'Tags' },
                            { model: Establishment, include: [{ model: User }] }
                        ]
                    })).map(async (service) =>
                    {
                        const totalRatings = await Rating.count({ where: { receiverUserid: service.Establishment.User.id } });
                        const averageRating = await Rating.findOne({
                            where: { receiverUserid: service.Establishment.User.id },
                            attributes: [[fn('AVG', col('rate')), 'averageRating']]
                        });

                        let isInterested = false;
                        if (isArtist && typeof service.hasArtist === 'function')
                        {
                            isInterested = await service.hasArtist(isArtist);
                        }

                        return {
                            ...service.dataValues,
                            Tags: service.Tags.map(tag => tag.dataValues),
                            Establishment: service.Establishment
                                ? {
                                    ...service.Establishment.dataValues,
                                    User: service.Establishment.User
                                        ? {
                                            ...service.Establishment.User.dataValues,
                                            TotalRatings: totalRatings,
                                            AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0
                                        }
                                        : null
                                }
                                : null,
                            isInterested
                        };
                    })
                );
            }

            // Mescla ambos os resultados
            let results = [
                ...userResults.map(result => ({
                    ...result,
                    isArtist: typeof result.isArtist !== 'undefined' ? result.isArtist : false, // já vem do map acima
                    _type: 'user'
                })),
                ...serviceResults.map(result => ({
                    ...result,
                    _type: 'service'
                }))
            ];

            // Ordena alfabeticamente pelo campo 'name'
            results = results.sort((a, b) =>
            {
                if (!a.name) return 1;
                if (!b.name) return -1;
                return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
            });

            return res.render('app/search', { search: search, results: results, css: 'pesquisar.css' });
        } catch (err)
        {
            console.error(err);
            return res.status(500).json({ message: 'Erro ao realizar a busca.' });
        }
    }

    static async getFilter(req, res)
    {
        const { search, type, tags } = req.query;
        const tagsid = tags ? tags.split(',').filter(Boolean).map(id => parseInt(id)) : [];
        const loggedUserId = req.session.userid;

        // Descobre se é artista logado
        let isArtist = null;
        if (loggedUserId)
        {
            isArtist = await Artist.findOne({ where: { userid: loggedUserId } });
        }

        const include = [];
        if (type === 'artista')
        {
            include.push({ model: Artist, required: true });
            include.push({ model: Tag, as: 'Tags', required: tagsid.length > 0, where: tagsid.length > 0 ? { id: tagsid } : undefined });
        } else if (type === 'estabelecimento')
        {
            include.push({ model: Establishment, required: true });
            include.push({ model: Tag, as: 'Tags', required: tagsid.length > 0, where: tagsid.length > 0 ? { id: tagsid } : undefined });
        } else if (type === 'todos')
        {
            include.push({ model: Artist, required: false });
            include.push({ model: Establishment, required: false });
            include.push({ model: Tag, as: 'Tags', required: tagsid.length > 0, where: tagsid.length > 0 ? { id: tagsid } : undefined });
        }

        try
        {
            if (search)
            {
                if (type === 'servico')
                {
                    let serviceWhere = {
                        [Op.or]: [
                            where(fn('LOWER', col('ServiceRequest.name')), {
                                [Op.like]: `%${ search.toLowerCase() }%`
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
                    // Para cada serviço, buscar todas as tags relacionadas
                    const results2 = await Promise.all(
                        results.map(async (result) =>
                        {
                            // Buscar todas as tags relacionadas a este serviço
                            const allTags = await result.getTags();
                            const totalRatings = await Rating.count({ where: { receiverUserid: result.Establishment.User.id } });
                            const averageRating = await Rating.findOne({
                                where: { receiverUserid: result.Establishment.User.id },
                                attributes: [[fn('AVG', col('rate')), 'averageRating']]
                            });

                            // Checa se o artista logado está interessado
                            let isInterested = false;
                            if (isArtist && typeof result.hasArtist === 'function')
                            {
                                isInterested = await result.hasArtist(isArtist);
                            }

                            return {
                                ...result.dataValues,
                                Tags: allTags.map(tag => tag.dataValues),
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
                                isInterested,
                                _type: 'service'
                            };
                        })
                    );
                    return res.json({ results2, search: search });
                } else if (type === 'artista')
                {
                    // Busca usuários que são artistas
                    const userResults = await Promise.all(
                        (await User.findAll({
                            where: {
                                [Op.or]: [
                                    where(fn('LOWER', col('User.name')), {
                                        [Op.like]: `%${ search.toLowerCase() }%`
                                    })
                                ],
                                isAdmin: false
                            },
                            attributes: { exclude: ['password'] },
                            include: [
                                { model: Artist, required: true },
                                { model: Tag, as: 'Tags', required: tagsid.length > 0, where: tagsid.length > 0 ? { id: tagsid } : undefined }
                            ]
                        })).map(async (user) =>
                        {
                            const allTags = await user.getTags();
                            const totalRatings = await Rating.count({ where: { receiverUserid: user.id } });
                            const averageRating = await Rating.findOne({
                                where: { receiverUserid: user.id },
                                attributes: [[fn('AVG', col('rate')), 'averageRating']]
                            });
                            return {
                                ...user.dataValues,
                                Tags: allTags.map(tag => tag.dataValues),
                                TotalRatings: totalRatings,
                                AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0,
                                _type: 'user',
                                isArtist: true
                            };
                        })
                    );
                    const results2 = userResults.sort((a, b) =>
                    {
                        if (!a.name) return 1;
                        if (!b.name) return -1;
                        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
                    });
                    return res.json({ results2, search: search });
                } else if (type === 'estabelecimento')
                {
                    // Busca usuários que são estabelecimentos
                    const userResults = await Promise.all(
                        (await User.findAll({
                            where: {
                                [Op.or]: [
                                    where(fn('LOWER', col('User.name')), {
                                        [Op.like]: `%${ search.toLowerCase() }%`
                                    })
                                ],
                                isAdmin: false
                            },
                            attributes: { exclude: ['password'] },
                            include: [
                                { model: Establishment, required: true },
                                { model: Tag, as: 'Tags', required: tagsid.length > 0, where: tagsid.length > 0 ? { id: tagsid } : undefined }
                            ]
                        })).map(async (user) =>
                        {
                            const allTags = await user.getTags();
                            const totalRatings = await Rating.count({ where: { receiverUserid: user.id } });
                            const averageRating = await Rating.findOne({
                                where: { receiverUserid: user.id },
                                attributes: [[fn('AVG', col('rate')), 'averageRating']]
                            });
                            return {
                                ...user.dataValues,
                                Tags: allTags.map(tag => tag.dataValues),
                                TotalRatings: totalRatings,
                                AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0,
                                _type: 'user',
                                isArtist: false
                            };
                        })
                    );
                    const results2 = userResults.sort((a, b) =>
                    {
                        if (!a.name) return 1;
                        if (!b.name) return -1;
                        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
                    });
                    return res.json({ results2, search: search });
                } else if (type === 'todos')
                {
                    const userResults = await Promise.all(
                        (await User.findAll({
                            where: {
                                [Op.or]: [
                                    where(fn('LOWER', col('User.name')), {
                                        [Op.like]: `%${ search.toLowerCase() }%`
                                    })
                                ],
                                isAdmin: false
                            },
                            attributes: { exclude: ['password'] },
                            include: include
                        })).map(async (user) =>
                        {
                            // Buscar todas as tags relacionadas a este usuário
                            const allTags = await user.getTags();
                            const totalRatings = await Rating.count({ where: { receiverUserid: user.id } });
                            const averageRating = await Rating.findOne({
                                where: { receiverUserid: user.id },
                                attributes: [[fn('AVG', col('rate')), 'averageRating']]
                            });

                            return {
                                ...user.dataValues,
                                Tags: allTags.map(tag => tag.dataValues),
                                TotalRatings: totalRatings,
                                AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0,
                                _type: 'user',
                                isArtist: user.dataValues.Artist ? true : false
                            };
                        })
                    );

                    let serviceWhere = {
                        [Op.or]: [
                            where(fn('LOWER', col('ServiceRequest.name')), {
                                [Op.like]: `%${ search.toLowerCase() }%`
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
                                isArtist: typeof result.isArtist !== 'undefined' ? result.isArtist : false,
                                _type: 'user'
                            })),
                            ...serviceResults.map(async (result) =>
                            {
                                // Buscar todas as tags relacionadas a este serviço
                                const allTags = await result.getTags();
                                const totalRatings = await Rating.count({ where: { receiverUserid: result.Establishment.User.id } });
                                const averageRating = await Rating.findOne({
                                    where: { receiverUserid: result.Establishment.User.id },
                                    attributes: [[fn('AVG', col('rate')), 'averageRating']]
                                });

                                // Checa se o artista logado está interessado
                                let isInterested = false;
                                if (isArtist && typeof result.hasArtist === 'function')
                                {
                                    isInterested = await result.hasArtist(isArtist);
                                }

                                return {
                                    ...result.dataValues,
                                    Tags: allTags.map(tag => tag.dataValues),
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
                                    isInterested,
                                    _type: 'service'
                                };
                            })
                        ]
                    );
                    results2 = results2.sort((a, b) =>
                    {
                        if (!a.name) return 1;
                        if (!b.name) return -1;
                        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
                    });
                    return res.json({ results2, search: search });
                }
            } else
            {
                if (type === 'servico')
                {
                    let serviceInclude = [
                        { model: Tag, as: 'Tags', required: tagsid.length > 0, where: tagsid.length > 0 ? { id: tagsid } : undefined },
                        { model: Establishment, include: [{ model: User }] }
                    ];
                    const results = await ServiceRequest.findAll({
                        include: serviceInclude
                    });
                    const results2 = await Promise.all(
                        results.map(async (result) =>
                        {
                            // Buscar todas as tags relacionadas a este serviço
                            const allTags = await result.getTags();
                            const totalRatings = await Rating.count({ where: { receiverUserid: result.Establishment.User.id } });
                            const averageRating = await Rating.findOne({
                                where: { receiverUserid: result.Establishment.User.id },
                                attributes: [[fn('AVG', col('rate')), 'averageRating']]
                            });

                            // Checa se o artista logado está interessado
                            let isInterested = false;
                            if (isArtist && typeof result.hasArtist === 'function')
                            {
                                isInterested = await result.hasArtist(isArtist);
                            }

                            return {
                                ...result.dataValues,
                                Tags: allTags.map(tag => tag.dataValues),
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
                                isInterested,
                                _type: 'service'
                            };
                        })
                    );
                    return res.json({ results2, search: search });
                } else if (type === 'todos')
                {
                    const userResults = await Promise.all(
                        (await User.findAll({
                            where: {isAdmin: false},
                            attributes: { exclude: ['password'] },
                            include: include
                        })).map(async (user) =>
                        {
                            // Buscar todas as tags relacionadas a este usuário
                            const allTags = await user.getTags();
                            const totalRatings = await Rating.count({ where: { receiverUserid: user.id } });
                            const averageRating = await Rating.findOne({
                                where: { receiverUserid: user.id },
                                attributes: [[fn('AVG', col('rate')), 'averageRating']]
                            });

                            return {
                                ...user.dataValues,
                                Tags: allTags.map(tag => tag.dataValues),
                                TotalRatings: totalRatings,
                                AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0,
                                isArtist: user.dataValues.Artist ? true : false
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
                                isArtist: typeof result.isArtist !== 'undefined' ? result.isArtist : false,
                                _type: 'user'
                            })),
                            ...serviceResults.map(async (result) =>
                            {
                                // Buscar todas as tags relacionadas a este serviço
                                const allTags = await result.getTags();
                                const totalRatings = await Rating.count({ where: { receiverUserid: result.Establishment.User.id } });
                                const averageRating = await Rating.findOne({
                                    where: { receiverUserid: result.Establishment.User.id },
                                    attributes: [[fn('AVG', col('rate')), 'averageRating']]
                                });

                                // Checa se o artista logado está interessado
                                let isInterested = false;
                                if (isArtist && typeof result.hasArtist === 'function')
                                {
                                    isInterested = await result.hasArtist(isArtist);
                                }

                                return {
                                    ...result.dataValues,
                                    Tags: allTags.map(tag => tag.dataValues),
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
                                    isInterested,
                                    _type: 'service',
                                };
                            })
                        ]);

                    results2 = results2.sort((a, b) =>
                    {
                        if (!a.name) return 1;
                        if (!b.name) return -1;
                        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
                    });
                    return res.json({ results2, search: search });
                } else
                {
                    const results = await Promise.all(
                        (await User.findAll({
                            where: {isAdmin: false},
                            attributes: { exclude: ['password'] },
                            include: include
                        })).map(async (user) =>
                        {
                            // Buscar todas as tags relacionadas a este usuário
                            const allTags = await user.getTags();
                            const totalRatings = await Rating.count({ where: { receiverUserid: user.id } });
                            const averageRating = await Rating.findOne({
                                where: { receiverUserid: user.id },
                                attributes: [[fn('AVG', col('rate')), 'averageRating']]
                            });

                            return {
                                ...user.dataValues,
                                Tags: allTags.map(tag => tag.dataValues),
                                TotalRatings: totalRatings,
                                AverageRating: averageRating ? parseFloat(averageRating.dataValues.averageRating).toFixed(1) : 0
                            };
                        })
                    );

                    const results2 = results.map(result => ({
                        ...result,
                        _type: 'user',
                        isArtist: result.Artist ? true : false
                    }));
                    return res.json({ results2, search: search });
                }
            }
        } catch (err)
        {
            console.log(err);
            return res.status(500).json({ message: 'Erro ao realizar a busca.' });
        }
    }
};