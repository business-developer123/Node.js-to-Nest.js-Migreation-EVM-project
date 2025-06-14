const mongoose = require("mongoose");

const tokenType = require("../constants/tokenType");
const tokenStatus = require("../constants/tokenStatus");
const tokenTradableType = require("../constants/tokenTradableType");

const TokenSchema = new mongoose.Schema({
  name: { type: String, required: true },
  audio: { type: mongoose.Schema.Types.Mixed, required: false },
  description: { type: String, required: true },
  symbol: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  type: {
    type: String,
    enum: [tokenType.DRRT, tokenType.PORTAL, tokenType.COLLECTIBLE],
    default: tokenType.DRRT,
    required: true,
  },
  icon: { type: mongoose.Schema.Types.Mixed, required: false },
  banner: { type: mongoose.Schema.Types.Mixed, required: true },
  portalID: { type: mongoose.Schema.Types.ObjectId, ref: "Portal" },
  gameID: { type: mongoose.Schema.Types.ObjectId, ref: "Game" },
  storyID: { type: mongoose.Schema.Types.ObjectId, ref: "Story" },
  storyFull: { type: mongoose.Schema.Types.Mixed },
  gameFull: { type: mongoose.Schema.Types.Mixed },
  portalFull: { type: mongoose.Schema.Types.Mixed },
  address: { type: String, unique: true, sparse: true, default: null },
  isDeployed: {
    type: Boolean,
    default: false,
  },
  createdDate: { type: Date, default: new Date() },
  tradable: {
    type: String,
    enum: Object.values(tokenTradableType),
    default: tokenTradableType.TRADABLE,
  },
  external_link: { type: String },
  seller_fee_basis_points: { type: Number, default: 20000 },
  price: { type: Number },
  status: { 
    type: String,
    enum: Object.values(tokenStatus),
    default: tokenStatus.DEVELOP,
  },
  ipfsIcon: { type: String },
  ipfsContractMetadata: { type: String },
  ipfsNftMetadata: { type: String },
  slides: mongoose.Schema.Types.Mixed,
  product: {
    isProduct: { type: Boolean, default: false },
    isCommemorative: { type: Boolean, default: false },
    isMultiplatform: { type: Boolean, default: false },
    sizes: { type : Array , "default" : [] },
  },
  makers: {
    creator: { type: String },
    builder: { type: String },
  },

  // old fields
  image: mongoose.Schema.Types.Mixed,
  issued: { type: Number },
  endActiveDate: { type: Date },
  netValue: { type: String },
  inventory: { type: Number, default: 1 },
  timestamp: { type: Date, default: new Date() },
});

module.exports = mongoose.model("Token", TokenSchema);
