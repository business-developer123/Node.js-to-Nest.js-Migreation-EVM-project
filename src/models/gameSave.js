const mongoose = require('mongoose')

const GameSaveSchema = new mongoose.Schema({
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
    messages: [mongoose.Schema.Types.Mixed],
    player: { type: Boolean, default: false },
    rulesRead: { type: Boolean, default: false },
    royalty: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    numberOfTimesDisplayedInVotes: { type: Number, default: 0 },
    state: { type: String, required: true },
    submission: { type: String, default: '' },
    submissionDate: Date,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    votes: mongoose.Schema.Types.Mixed,
    votesCasted: mongoose.Schema.Types.Mixed,
    votingDate: Date,
    seenInRanks: { type: Boolean, default: false },
    timestamp: {type: Date, default: new Date()}
})

module.exports = mongoose.model('GameSave', GameSaveSchema);