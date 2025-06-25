module.exports = function setupAssociations(models)
{
    const { User, Artist, Establishment, Album, Music, Genre, Tag, Chat, Message, Event, ServiceRequest, Service, ServiceNote, ServiceProposal, Rating, Favorite } = models;

    Artist.belongsTo(User, {
        foreignKey: 'userid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })

    User.hasOne(Artist, { foreignKey: 'userid' }) //precisa especificar foreign key em ambos para o sequelize não criar chaves duplicadas

    Establishment.belongsTo(User, {
        foreignKey: 'userid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })

    User.hasOne(Establishment, { foreignKey: 'userid' }) //precisa especificar foreign key em ambos para o sequelize não criar chaves duplicadas

    Music.belongsTo(Genre, {
        foreignKey: 'genreid',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    })

    Genre.hasMany(Music, {
        foreignKey: 'genreid',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    })

    Music.belongsTo(Artist, {
        foreignKey: 'userid',
        targetKey: 'cpf',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        as: 'Artist'
    })

    Artist.hasMany(Music, {
        foreignKey: 'userid',
        sourceKey: 'cpf',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        as: 'Musics'
    })

    Music.belongsToMany(Album, {
        foreignKey: 'musicid',
        otherKey: 'albumid',
        through: 'AlbumMusic',
        onDelete: 'CASCADE',
        as: 'Albums'
    })

    Album.belongsToMany(Music, {
        foreignKey: 'albumid',
        otherKey: 'musicid',
        through: 'AlbumMusic',
        onDelete: 'CASCADE',
        as: 'Musics'
    })

    Album.belongsTo(Artist, {
        foreignKey: 'userid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })

    Artist.hasMany(Album, {
        foreignKey: 'userid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })

    Music.belongsToMany(Tag, {
        foreignKey: 'musicid',
        otherKey: 'tagid',
        through: 'MusicTag',
        onDelete: 'CASCADE',
        as: 'Tags'
    })

    Tag.belongsToMany(Music, {
        foreignKey: 'tagid',
        otherKey: 'musicid',
        through: 'MusicTag',
        onDelete: 'CASCADE',
        as: 'Musics'
    })

    //chat
    User.belongsToMany(Chat, {
        foreignKey: 'userid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        through: 'UserChat',
        otherKey: 'chatid'
    });

    Chat.belongsToMany(User, {
        foreignKey: 'chatid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        through: 'UserChat',
        otherKey: 'userid'
    });

    Message.belongsTo(Chat, {
        foreignKey: 'chatid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    Chat.hasMany(Message, {
        foreignKey: 'chatid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    Message.belongsTo(User, {
        foreignKey: 'userid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    Event.belongsTo(Establishment, {
        foreignKey: 'establishmentid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })

    Establishment.hasMany(Event, {
        foreignKey: 'establishmentid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })

    ServiceRequest.belongsTo(Establishment, {
        foreignKey: 'establishmentid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })

    Establishment.hasMany(ServiceRequest, {
        foreignKey: 'establishmentid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })

    ServiceRequest.belongsToMany(Tag, {
        foreignKey: 'servicerequestid',
        otherKey: 'tagid',
        through: 'ServiceRequestTag',
        onDelete: 'CASCADE',
        as: 'Tags'
    })

    Tag.belongsToMany(ServiceRequest, {
        foreignKey: 'tagid',
        otherKey: 'servicerequestid',
        through: 'ServiceRequestTag',
        onDelete: 'CASCADE',
        as: 'ServiceRequests'
    })

    User.belongsToMany(Tag, {
        foreignKey: 'userid',
        otherKey: 'tagid',
        through: 'UserTag',
        onDelete: 'CASCADE',
        as: 'Tags'
    })

    Tag.belongsToMany(User, {
        foreignKey: 'tagid',
        otherKey: 'userid',
        through: 'UserTag',
        onDelete: 'CASCADE',
        as: 'Users'
    })

    Service.belongsTo(User, {
        foreignKey: 'userid',
        as: 'Receiver',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    Service.belongsTo(User, {
        foreignKey: 'senderid',
        as: 'Sender',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    User.hasMany(Service, {
        foreignKey: 'userid',
        as: 'ReceivedServices',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    User.hasMany(Service, {
        foreignKey: 'senderid',
        as: 'SentServices',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    Service.belongsToMany(Tag, {
        foreignKey: 'serviceid',
        otherKey: 'tagid',
        through: 'ServiceTags',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    Tag.belongsToMany(Service, {
        foreignKey: 'tagid',
        otherKey: 'serviceid',
        through: 'ServiceTags',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    Service.hasMany(ServiceNote, {
        foreignKey: 'serviceid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    ServiceNote.belongsTo(Service, {
        foreignKey: 'serviceid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    ServiceProposal.belongsTo(User, {
        as: 'Receiver',
        foreignKey: 'userid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    ServiceProposal.belongsTo(User, {
        as: 'Sender',
        foreignKey: 'senderUserid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    User.hasMany(ServiceProposal, {
        as: 'ReceivedProposals',
        foreignKey: 'userid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    User.hasMany(ServiceProposal, {
        as: 'SentProposals',
        foreignKey: 'senderUserid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    Rating.belongsTo(User, {
        as: 'Sender',
        foreignKey: 'senderUserid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    Rating.belongsTo(User, {
        as: 'Receiver',
        foreignKey: 'receiverUserid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    User.hasMany(Rating, {
        as: 'ReceivedRatings',
        foreignKey: 'receiverUserid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    User.hasMany(Rating, {
        as: 'SentRatings',
        foreignKey: 'senderUserid',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    User.belongsToMany(User, {
        through: Favorite,
        as: 'FavoritedUsers', // Alias único para os usuários favoritados
        foreignKey: 'userid', // ID do usuário que tem favoritos
        otherKey: 'favoriteid', // ID do usuário favoritado
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    User.belongsToMany(User, {
        through: Favorite,
        as: 'FavoritedByUsers', // Alias único para os usuários que favoritaram
        foreignKey: 'favoriteid', // ID do usuário favoritado
        otherKey: 'userid', // ID do usuário que favoritou
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    ServiceRequest.belongsToMany(Artist, {
        foreignKey: 'servicerequestid',
        otherKey: 'artistid',
        through: 'ServiceRequestArtists',
        as: 'Artists',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })

    Artist.belongsToMany(ServiceRequest, {
        foreignKey: 'artistid',
        otherKey: 'servicerequestid',
        through: 'ServiceRequestArtists',
        as: 'ServiceRequests',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
};