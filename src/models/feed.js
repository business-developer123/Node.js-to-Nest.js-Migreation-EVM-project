const mongoose = require("mongoose");

const FeedSchema = new mongoose.Schema(
  {
    title: { type: String, required: false },
    message: { type: String, required: false },
    mobileFile: { type: String, required: false },
    desktopFile: { type: String, required: false },
    type: { type: String, required: true },
    category: { type: String, required: true },
    portalID: { type: mongoose.Schema.Types.ObjectId, ref: "Portal" },
    portalFull: { type: mongoose.Schema.Types.Mixed },
    gameID: { type: mongoose.Schema.Types.ObjectId, ref: "Game" },
    storyID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
    },
    gameFull: { type: mongoose.Schema.Types.Mixed },
    storyFull: { type: mongoose.Schema.Types.Mixed },
    mobileVideos: { type: mongoose.Schema.Types.Mixed },
    desktopVideos: { type: mongoose.Schema.Types.Mixed },
    thumbnails: { type: mongoose.Schema.Types.Mixed },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    messages: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

module.exports = mongoose.model("Feed", FeedSchema);
