const mongoose = require('mongoose')

const DatastreamSchema = new mongoose.Schema({
    portal: { type: String, required: true },
    link: { type: String },
    text: { type: String },
    expired: { type: Boolean },
    restrict: { showAll: {type: Boolean}, type: {type: String} },
    timestamp: { type: Date, default: new Date() }
})

module.exports = mongoose.model('Datastream', DatastreamSchema);