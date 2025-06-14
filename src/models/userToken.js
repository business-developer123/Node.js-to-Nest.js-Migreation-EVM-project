const mongoose = require('mongoose')


const UserTokenSchema = new mongoose.Schema({
    userEmail: { type: String, required: true },
    tokenID: { type: mongoose.Schema.Types.ObjectId, ref: 'Token' },
})

module.exports = mongoose.model('UserToken', UserTokenSchema);