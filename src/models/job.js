const mongoose = require('mongoose')

const JobSchema = new mongoose.Schema({
    name: String,
    startTime: Date,
    endTime: Date,
    rule: mongoose.Schema.Types.Mixed,
    when: Date,
    what: String,
    args: [],
    pending: {type: Boolean, default: true},
    timestamp: {type: Date, default: new Date()}
})


module.exports = mongoose.model('Job', JobSchema);