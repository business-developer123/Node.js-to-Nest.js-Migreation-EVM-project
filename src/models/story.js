const mongoose = require('mongoose')

const StorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  status: { type: String },
  storyType: { type: String, required: false },
  createdDate: { type: Date, default: new Date() },
  icon: { type: mongoose.Schema.Types.Mixed, required: true },
  banner: { type: mongoose.Schema.Types.Mixed, required: false },
  number: { type: Number, unique: true, min: 0 },
  type: { type: String, default: "STORY" },
  desktopVideo: { type: mongoose.Schema.Types.Mixed, required: false },
  mobileVideo: { type: mongoose.Schema.Types.Mixed, required: false },
  makers: {
    cast: { type: String },
    director: { type: String },
    writer: { type: String },
    vibe: { type: String },
    producer: { type: String },
    executive_producer: { type: String },
  }
})

module.exports = mongoose.model('Story', StorySchema);
