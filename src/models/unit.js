const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const {
  USER,
  CARTOON,
  PORTAL,
  OBJECT,
  PRODUCT,
} = require("../constants/unitType");

const UnitSchema = new mongoose.Schema({
  unitId: { type: mongoose.Schema.Types.ObjectId, required: true },
  image: { type: String },
  unitType: {
    type: String,
    required: true,
    enum: [USER, CARTOON, PORTAL, OBJECT, PRODUCT],
  },
  name: { type: String, required: true },
  description: { type: String },
});

UnitSchema.index({ name: "text" });

UnitSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Unit", UnitSchema);
