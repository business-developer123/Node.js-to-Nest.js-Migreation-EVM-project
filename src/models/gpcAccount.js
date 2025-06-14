const mongoose = require('mongoose')
var passportLocalMongoose = require("passport-local-mongoose");
const userType = require('../constants/userType')

const GpcAccountSchema = new mongoose.Schema({
    username: String,
    firstName: String,
    lastName: String,
    company: String,
    email: String,
    phoneNumber: Number,
    type: { type: String, default: userType.PUSHUSER },
    password: String,
    coinCount: { type: Number, default: 0 },
    last4Acc: { type: String, default: "" },
    last4Card: { type: String, default: "" },
    card: Boolean,
    bank: Boolean,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    weeklyCoinAmount:{ type: Number, default: 0 }, 
    cashedOutAmount: { type: Number, default: 0 },
    stripeAccountID: { type: String, default: '' },
    creationDate: { type: Date, default: new Date()}
})

GpcAccountSchema.plugin(passportLocalMongoose, {usernameField: 'email'});

module.exports = mongoose.model('GpcAccount', GpcAccountSchema);