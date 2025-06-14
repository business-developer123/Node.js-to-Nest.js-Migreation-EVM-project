const mongoose = require('mongoose');
require('mongoose-type-ethereum-address');
var passportLocalMongoose = require('passport-local-mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const userRoles = require('../constants/userRoles');
const userType = require('../constants/userType');
const deliveryOptions = require('../constants/deliveryOptions');
const chatGameType = require('../constants/chatGameType');

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  entry: { type: Boolean, default: false },
  firstName: String,
  lastName: String,
  phoneNumber: { type: String, unique: true },
  ethAddress: mongoose.Schema.Types.EthereumAddress,
  connectRoyalties: { type: Boolean, default: false },
  itRoyalties: { type: Number, default: 0 },
  royalties: { type: Number, default: 0 },
  password: String,
  tag: String,
  coinCount: { type: Number, default: 0 },
  goBorbBalance: { type: Number, default: 0 },
  verified: Boolean,
  card: Boolean,
  bank: Boolean,
  gpcAccount: { type: Boolean, default: false },
  zone: String,
  hub: String,
  creative: String,
  favoriteColor: String,
  last4Acc: { type: String, default: '' },
  last4Card: { type: String, default: '' },
  onboarding: Boolean,
  password: String,
  onboardingIndex: { type: Number, required: true, default: 0 },
  chatQuestionIndex: { type: Number, required: true, default: -1 },
  systemMessageIndex: { type: Number, required: true, default: -1 },
  nodeID: String,
  identification: String,
  stripeAccountID: { type: String, default: '' },
  stripeCustomerID: { type: String, default: '' },
  stripeIdentityState: {
    type: String,
    enum: ['none', 'pending', 'success'],
    default: 'none',
  },
  type: { type: String, default: userType.PUSHUSER },
  role: { type: String, default: userRoles.USER },
  verifiedEmail: { type: Boolean, default: false },
  verifyEmail: mongoose.Schema.Types.Mixed,
  verifiedPhone: { type: Boolean, default: false },
  tokenBought: { type: mongoose.Schema.Types.ObjectId, ref: 'Token' },
  hasNewMessage: { type: Boolean, default: false },
  address: { street: { type: String }, city: { type: String }, zip: { type: String }, state: { type: String } },
  deliveryOption: { type: String, default: deliveryOptions.NO_DELIVERY },
  gamesSeenInRanks: { type: Array },
  chatQuestions: [
    {
      chatGameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatGame',
        required: true,
      },
      answer: String,
    },
  ],
  chatSystemMessages: [
    {
      chatGameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatGame',
        required: true,
      },
      answer: String,
    },
  ],
  chatHistory: [
    {
      message: { type: String, required: true, default: '' },
      isMyOwn: { type: Boolean, required: true },
      seen: { type: Boolean, default: false },
      chatGameType: {
        type: String,
        required: true,
        default: chatGameType.SYSTEM_MESSAGE,
      },
      field: { type: String, default: '' },
      picture: { type: String, default: '' },
      link: { type: String, default: '' },
      messageCreationDate: { type: Date },
    },
  ],
  birthDate: { type: Date },
  creationDate: { type: Date, default: new Date() },
  portalID: { type: mongoose.Schema.Types.ObjectId, ref: 'Portal' },
});

UserSchema.index({ email: 1, username: 1, type: 1 }, { unique: true });
UserSchema.plugin(passportLocalMongoose, {
  usernameQueryFields: ['email', 'username', 'type'],
  usernameUnique: true,
});

UserSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('User', UserSchema);
