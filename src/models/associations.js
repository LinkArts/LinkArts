module.exports = function setupAssociations(models)
{
    const { User, Artist, Establishment, Album, Music, Genre } = models;

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
};