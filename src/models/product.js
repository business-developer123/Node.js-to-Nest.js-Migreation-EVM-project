const mongoose = require('mongoose')
const productStates = require('../constants/productStates')

const ProductSchema = new mongoose.Schema({
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    tokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Token' },
    cost: { type: Number, default: 1 },
    inventory: { type: Number, default: 1 },
    description: { type: String, required: true },
    type: { type: String },
    pickColor: { type: Boolean, default: false},
    pickSize: { type: Boolean, default: false},
    images: [mongoose.Schema.Types.Mixed],
    name: { type: String, required: true },
    portal: { type: String },
    number: { type: String, default: " " },
    size: { type: Array },
    color: { type: Array },
    objects: [],
    topObjectCreated: { type: Number, default: 0},
    numberOfGames: { type: Number, default: 0},
    royalties: mongoose.Schema.Types.Mixed,
    state: { type: String, required: true, default: productStates.DEVELOPING },
    timestamp: {type: Date, default: new Date()}
})

module.exports = mongoose.model('Product', ProductSchema);