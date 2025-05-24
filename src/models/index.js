const User = require('./User');
const Artist = require('./Artist');
const Establishment = require('./Establishment');
const Music = require('./Music');
const Album = require('./Album');
const Genre = require('./Genre');

const models = { User, Artist, Establishment, Music, Album, Genre };

// Setup associations
const setupAssociations = require('./associations');
setupAssociations(models);

// Exporte os modelos prontos
module.exports = models;