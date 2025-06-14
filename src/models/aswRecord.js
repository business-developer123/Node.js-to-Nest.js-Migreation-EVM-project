const mongoose = require('mongoose')

const AwsRecordSchema = new mongoose.Schema({
  objectKey: { type: String, required: true },
  userId: { type: String, required: true },
  uploadType: { type: String, required: true },
  referenceId : { type: String },
  playbackUrl : { type: String, required: true },
  timestamp : { type: Date, default: new Date() },
})

module.exports = mongoose.model('AwsRecord', AwsRecordSchema);
