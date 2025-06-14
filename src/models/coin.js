const mongoose = require('mongoose')

const CoinSchema = new mongoose.Schema({
    usdAmountFromStripe: Number,
    coinAmountFromStripe: Number,
    coinAmountInSystem: Number,
    usdAmountInSystem: Number,
    usersCoins: Number,
    brandsCoins: Number,
    amountCashedOut: Number,
    timestamp: {type: Date, default: new Date()}
})


module.exports = mongoose.model('Coin', CoinSchema);