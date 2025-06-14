const mongoose = require('mongoose')

const OrderSchema = new mongoose.Schema({
    tokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Token', required: false },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    chargeId: { type: String, required: false },
    deliveryInfo: { type: mongoose.Schema.Types.Mixed, required: false },
    userEthAddress: { type: String, required: false },
    cost: { type: Number, default: 1 },
    size: { type: String },
    description: { type: String, required: false },
    color: { type: String },
    image: { type: String },
    quantity: { type: Number },
    name: { type: String },
    timestamp: {type: Date, default: new Date()}
})

module.exports = mongoose.model('Order', OrderSchema);
