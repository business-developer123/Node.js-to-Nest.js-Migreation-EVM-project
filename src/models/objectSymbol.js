const mongoose = require('mongoose')
var passportLocalMongoose = require("passport-local-mongoose");

const ObjectSymbolSchema = new mongoose.Schema({
    symbolUrl: String,
    category: String
})

ObjectSymbolSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('ObjectSymbol', ObjectSymbolSchema);