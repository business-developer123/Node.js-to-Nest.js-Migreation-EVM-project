const mongoose = require('mongoose');
const { TEXT, SELECT, NONE } = require('../constants/answerInputType');
const { SYSTEM_MESSAGE, QUESTION, MULTIPLE} = require('../constants/chatGameType');
const { DIRECT, INDIRECT, SPECIFIC } = require('../constants/chatQueryType');

const ChatGameSchema = new mongoose.Schema({
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  filters: [
    { 
      key: { type: String, required: true },
      value: { type: Array, required: true }
    }
  ],
  message: { type: String, required: true },
  poolAmount: { type: Number, required: true, default: 0 },
  answerInputType: { type: String, required: true, enum: [TEXT, SELECT, NONE] },
  chatGameType: { type: String, required: true, enum: [QUESTION, SYSTEM_MESSAGE, MULTIPLE] },
  chatQueryType: { type: String, required: true, enum: [DIRECT, INDIRECT, SPECIFIC] },
  answers: Array,
  action: String,
  fieldName: String,
  reply: String,
  email: String,
  username: String
});

module.exports = mongoose.model('ChatGame', ChatGameSchema);