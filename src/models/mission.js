const mongoose = require('mongoose')

const MissionSchema = new mongoose.Schema({
    audioContent: [
        {
            src: { type: String },
            ogg: { type: String },
            placeholder: { type: String},
            name: { type: String},
            backgroundColor: { type: String},
            textColor: { type: String}
        }
    ],
    videoContent: [
        {
            src: { type: String },
            placeholder: { type: String},
            name: { type: String},
            backgroundColor: { type: String},
            textColor: { type: String}
        }
    ],
    podcastContent: [
        {
            src: { type: String },
            placeholder: { type: String},
            name: { type: String},
            backgroundColor: { type: String},
            textColor: { type: String}
        }
    ],
    mission: [
        {
            img: { type: String },
            cartoon: { type: String},
            cartoonName: { type: String },
            details: { type: String},
            name: { type: String},
            date: {type: Date}
        }
    ],
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    themeColor: { type: String },
    missionLength : { type: Number, default: 1 },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' },],
    products: {type: Array},
    backgroundShop: {type: String}
})

module.exports = mongoose.model('Mission', MissionSchema);