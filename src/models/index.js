const User = require('./User');
const Artist = require('./Artist');
const Establishment = require('./Establishment');
const Music = require('./Music');
const Album = require('./Album');
const Genre = require('./Genre');
const Chat = require('./Chat');
const Tag = require('./Tag');
const Message = require('./Message');
const Event = require('./Event');
const ServiceRequest = require('./ServiceRequest');

const models = { User, Artist, Establishment, Music, Album, Genre, Chat, Tag, Message, Event, ServiceRequest };

// Setup associations
const setupAssociations = require('./associations');
setupAssociations(models);

// Exporte os modelos prontos
module.exports = models;