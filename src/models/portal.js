const mongoose = require('mongoose')

const PortalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  url: { type: String },
  icon: { type: mongoose.Schema.Types.Mixed, required: true },
  createdDate: { type: Date, default: new Date() },
  active: { type: Boolean, default: false },
})

module.exports = mongoose.model('Portal', PortalSchema);