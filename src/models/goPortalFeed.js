const mongoose = require('mongoose');

const GoPortalFeedSchema = new mongoose.Schema({
    imageUrl: { type: String, required: true },
    link: { type: String, required: false },
    description: { type: String, required: true },
    }, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

module.exports = mongoose.model('GoPortalFeed', GoPortalFeedSchema);
