const mongoose = require('mongoose')
require('mongoose-type-ethereum-address');

const BlockchainTransactionSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.EthereumAddress, required: true },
  to: { type: mongoose.Schema.Types.EthereumAddress, required: true },
  tokenAddress: { type: mongoose.Schema.Types.EthereumAddress, required: true },
  amount: { type: Number },
  quantity: { type: Number, default: 1 },
  transactionCreated: { type: Date, default: new Date() },
  success: { type: Boolean, default: false },
  deliverAssets: { type: Boolean, default: false },
  user: { type: mongoose.Schema.Types.Mixed },
  token: { type: mongoose.Schema.Types.Mixed },
})


module.exports = mongoose.model('BlockchainTransaction', BlockchainTransactionSchema);