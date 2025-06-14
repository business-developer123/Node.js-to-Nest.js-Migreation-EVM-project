const mongoose = require("mongoose");
const gamesCategories = require("../constants/gamesCategories");

const GameSchema = new mongoose.Schema({
  attempt: { type: Number, default: 1 },
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: "Story" },
  story: { type: mongoose.Schema.Types.Mixed },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: false,
  },
  endDate: { type: Date, required: true },
  mission: { type: String, required: true },
  filters: [
    {
      key: { type: String, required: true },
      value: { type: Array, required: true },
    },
  ],
  symbol: String,
  name: { type: String, required: true },
  numPlayers: { type: Number, required: true, default: 0 },
  poolAmount: { type: Number, required: true },
  state: { type: String, required: true },
  startTime: { type: Date, required: false },
  playTime: { type: Date, required: false },
  voteTime: { type: Date, required: false },
  isPlayTimeExtended: { type: Boolean, default: false },
  isVoteTimeExtended: { type: Boolean, default: false },
  submissionDeadline: { type: Number, default: 86400000 },
  type: { type: String, default: gamesCategories.TEXT, required: true },
  category: { type: String, default: gamesCategories.TEXT, required: true },
  setRoyalties: { type: Boolean, default: true },
  reminderSent: { type: Boolean, default: false },
  profitPercentage: { type: Number, default: 100 },
  votingDeadline: { type: Number, default: 86400000 },
  timestamp: { type: Date, default: new Date() },
  productDetail: { type: String, default: "" },
  productContext: { type: String, default: "" },
  description: { type: String, default: "" },
  usersToShow: { type: mongoose.Schema.Types.Mixed, required: true },
  token: { type: mongoose.Schema.Types.Mixed, required: false },
  tokenID: { type: mongoose.Schema.Types.ObjectId || null, ref: 'Token', required: false },
  idOfToken: { type: String, default: "", required: false },
  forAllUsers: { type: Boolean, required: false },
  rules: {
    type: String,
    default:
      "Read and follow the instructions of the play to make sure you are doing what the brand is asking. Also as always — originality is key and it is against our terms condition to take, steal, and use others work that you did not create. Doing so is grounds for deactivation and being banned from the community.",
  },
  compensation: {
    type: String,
    default:
      "The coin amount of the pool is x which is worth x USD. Based on the % amount of the pool you are rewarded will be your royalty out of 20% of the retail cost of the the product. Example: product A sales for $100 and 20%  that is $20 and your play received 1% of the pool. You would get $0.20 of each shirt sold.",
  },
});

module.exports = mongoose.model("Game", GameSchema);
