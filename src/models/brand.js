const mongoose = require('mongoose')
var passportLocalMongoose = require("passport-local-mongoose");
const userRoles = require('../constants/userRoles');
const brandType = require('../constants/brandType')

const BrandSchema = new mongoose.Schema({
    username: String,
    firstName: String,
    lastName: String,
    phoneNumber: String,
    email: String,
    password: String,
    portal: String,
    coinCount: { type: Number, default: 0 },
    customerID: String,
    type: { type: String, default: brandType.PORTALPATHWAY },
    gpcAccount: {type: Boolean, default: false},
    onboarded: Boolean,
    verified: {type: Boolean, default: false},
    card: Boolean,
    bank: Boolean,
    payment: Boolean,
    paymentBank: Boolean,
    verifiedPaymentBank: Boolean,
    logo: String,
    businessName: String,
    description: String,
    brandDetail: String,
    city: String,
    state: String,
    country: String,
    category: String,
    subscription: {type: Boolean, default: false},
    gamePackage: { type: String, default: '' },
    whyPortalPathway: String,
    whatIsExpected: String,
    identification: String,
    stripeAccountID: { type: String, default: '' },
    role: {type: String, default: userRoles.BRAND},
    verifyEmail: mongoose.Schema.Types.Mixed,
    creationDate: { type: Date, default: new Date()}
})

BrandSchema.plugin(passportLocalMongoose, {usernameField: 'email'});

module.exports = mongoose.model('Brand', BrandSchema);