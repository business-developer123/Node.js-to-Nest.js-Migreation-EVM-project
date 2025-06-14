const mongoose = require('mongoose')

const TransactionSchema = new mongoose.Schema({
    purchased: {type: Boolean, default: false},
    received: {type: Boolean, default: false},
    cashedOut: {type: Boolean, default: false},
    payingRoyalty: {type: Boolean, default: false},
    payingBrand: {type: Boolean, default: false},
    reason: String,
    productId: String,
    gameId: String,
    storyId: { type: mongoose.Schema.Types.Mixed, required: false },
    storyFull: { type: mongoose.Schema.Types.Mixed, required: false },
    tokenFull: { type: mongoose.Schema.Types.Mixed, required: false },
    type: { type: String, required: false },
    withdrawn: { type: Boolean, default: false, required: false },
    portal: String,
    coinAmount: Number,
    symbol: {type: Object, defaul: []},
    user: {
        email: String,
        id: String,
        symbol: { type: String, required: false },
    },
    brand: {
        email: String,
        id: String,
    },
    event: String,
    transactionCreated: { type: Date }
})


module.exports = mongoose.model('Transaction', TransactionSchema);
