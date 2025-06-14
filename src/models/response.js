const mongoose = require('mongoose')

const ResponseSchema = new mongoose.Schema({
    text: {type: String, required: true},
    messageId: {type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true},
    message: {type: mongoose.Schema.Types.Mixed},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false},
    user: {type: mongoose.Schema.Types.Mixed},
    portalId: {type: mongoose.Schema.Types.ObjectId, ref: 'Portal', required: false},
    portal: {type: mongoose.Schema.Types.Mixed},
    fromUser: {type: Boolean, required: false, default: false},
    fromPortal: {type: Boolean, required: false, default: false},
    likes: {type: mongoose.Schema.Types.Mixed},
    isReviewed: {type: Boolean, required: false, default: false}
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})

module.exports = mongoose.model('Response', ResponseSchema);
