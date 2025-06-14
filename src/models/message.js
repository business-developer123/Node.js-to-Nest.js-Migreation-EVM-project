const mongoose = require('mongoose')

const MessageSchema = new mongoose.Schema({
  message: { type: String, required: true },
  feedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Feed', required: true },
  feed: { type: mongoose.Schema.Types.Mixed },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user: { type: mongoose.Schema.Types.Mixed },
  likes: { type: mongoose.Schema.Types.Mixed },
  responses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Response' }]
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
})

module.exports = mongoose.model('Message', MessageSchema);
