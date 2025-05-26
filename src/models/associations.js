module.exports = function setupAssociations(models)
{
    const { User, Artist, Establishment, Album, Music, Genre, Tag, Chat, Message } = models;

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
};