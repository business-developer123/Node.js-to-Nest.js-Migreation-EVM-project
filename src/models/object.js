const mongoose = require('mongoose')

const ObjectSchema = new mongoose.Schema({
    name: String,
    symbol: String,
    price: String, //value
    royaltyObject: {type: Boolean, default: false},
    royalty: { type: Number, default: 0 },
    users: [],
    image: String,
    type: String,
    description: String,
    percentage: { type: Number, default: 0 },
    brandOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    gameId: {type: String},
    productId: [],
    childObjects: [],
    inventory: Number,
    divvylandUsers: [],
    isMasterObject: {type: Boolean, default:false},
    numberOfSells: Number,
    timestamp: {type: Date, default: new Date()}
})


module.exports = mongoose.model('Object', ObjectSchema);