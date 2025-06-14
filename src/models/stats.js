const Mongoose = require('mongoose')
const PassportLocalMongoose = require('passport-local-mongoose')

const StatsSchema = new Mongoose.Schema({
    name: { type: String, required: true },
    stats: Mongoose.Schema.Types.Mixed,
})

StatsSchema.plugin(PassportLocalMongoose)

module.exports = Mongoose.model('Stats', StatsSchema)