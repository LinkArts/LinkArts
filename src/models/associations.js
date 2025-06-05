module.exports = function setupAssociations(models)
{
    const { User, Artist, Establishment, Album, Music, Genre, Tag, Chat, Message, Event, ServiceRequest, Service, ServiceNote, ServiceProposal } = models;

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
    })

    Album.belongsToMany(Music, {
        foreignKey: 'albumid',
        otherKey: 'musicid',
        through: 'AlbumMusic',
        onDelete: 'CASCADE',
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

    Service.belongsTo(User, { foreignKey: 'userId' });
    User.hasMany(Service, { foreignKey: 'userId' });

    Service.belongsToMany(Tag, { through: 'ServiceTags' });
    Tag.belongsToMany(Service, { through: 'ServiceTags' });

    Service.hasMany(ServiceNote, { foreignKey: 'serviceId' });
    ServiceNote.belongsTo(Service, { foreignKey: 'serviceId' });

    ServiceProposal.belongsTo(User, { as: 'Receiver', foreignKey: 'userId' });
    ServiceProposal.belongsTo(User, { as: 'Sender', foreignKey: 'senderUserId' });
    User.hasMany(ServiceProposal, { as: 'ReceivedProposals', foreignKey: 'userId' });
    User.hasMany(ServiceProposal, { as: 'SentProposals', foreignKey: 'senderUserId' });
};