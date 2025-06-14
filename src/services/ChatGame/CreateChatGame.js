const HttpStatus = require('http-status-codes');

const ChatGame = require('../../models/chatGame');
const User = require('../../models/user');
const { SYSTEM_MESSAGE, QUESTION} = require('../../constants/chatGameType');
const { DIRECT, INDIRECT, SPECIFIC } = require('../../constants/chatQueryType');

const execute = async (req, res) => {
  try {
    const { chatQueryType, username, email, type } = req.body;

    const chatGame = new ChatGame({
      ...req.body,
      brandId: req.user.id
    });
    await chatGame.save();

    const filters = {};
    const chatQuestions = { $push: {chatQuestions: { chatGameId: chatGame.id }} };
    const chatSystemMessages = { $push: {chatSystemMessages: { chatGameId: chatGame.id }} };
    if (chatGame.fieldName) chatQuestions[chatGame.fieldName] = 'None';

    if (chatQueryType === DIRECT) {
      chatGame.filters.forEach(element => {
        filters[element.key] = { '$in': element.value };
      });
    } else if (chatQueryType === INDIRECT) {
      if (chatGame.filters.length > 0) {
        filters['$or'] = [];
        chatGame.filters.forEach(element => {
          element.value.forEach(value => {
            const filter = {};
            filter[element.key] = value;
            filters['$or'].push(filter);
          });
        });
      }
    } else if (chatQueryType === SPECIFIC) {
      if (username) {
        filters['username'] = username;
      } else if (email) {
        filters['email'] = email;
      } else if (type) {
        filters['type'] = type
      }
    }

    if (chatGame.chatGameType === QUESTION) {
      await User.updateMany(filters, chatQuestions, { strict: false });
    } else if (chatGame.chatGameType === SYSTEM_MESSAGE) {
      await User.updateMany(filters, chatSystemMessages);
    }

    res.status(HttpStatus.OK).json(chatGame);
  } catch (err) {
    console.error(err.message);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Server Error' });
  }
}

module.exports = { execute };