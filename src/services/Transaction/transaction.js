const userType = require('../../constants/userType')
const User = require('../../models/user')
const Token = require('../../models/token')
const Transaction = require('../../models/transaction');
const BlockchainTransaction = require('../../models/blockchainTransaction');
const TransactionType = require('../../constants/transactionType');
const Story = require('../../models/story');
const Mongoose = require("mongoose");
const ObjectId = Mongoose.Types.ObjectId;

const limit = 100;

const getAllLedger = async (page) => {
  let pageNumber = page;
  if (isNaN(page) || page <= 0) {
    pageNumber = 1;
  }
  const skip = (pageNumber - 1) * limit;
  return await Transaction.find({})
    .sort({ transactionCreated: -1 })
    .limit(limit)
    .skip(skip);
}

const getUserLedger = async (user) => {
  return await Transaction.find({ 'user.id': user.id }).exec()
}

async function getAllUserTransactions (email){
  const userTransactions = [];
  const transactions = await Transaction.find({
    'user.email': email,
    $or: [ { type: { $in: [TransactionType.DISTRIBUTION, TransactionType.ONBOARDING, TransactionType.TOKEN_SALE, TransactionType.POOL] } },
      { event: /.*paid by.*/ }, { event: /.*completed onboarding.*/ } ]
  }).sort({ transactionCreated: -1 }).limit(10).exec();

  for (const transaction of transactions) {
    if (transaction.storyId) {
      transaction.storyFull = transaction.storyFull ? transaction.storyFull : await Story.findOne({ _id: ObjectId(transaction.storyId) });
      transaction.tokenFull = transaction.tokenFull ? transaction.tokenFull : await Token.findOne({ storyID: ObjectId(transaction.storyId)});
      userTransactions.push(transaction);
    } else {
      userTransactions.push(transaction);
    }
  }

  return { message: 'Success', transactions: userTransactions }
}

async function getAllUserLedger(userEmail, page) {
  let user = !userEmail ? null : await User.findOne({ email: userEmail, type: userType.PUSHUSER })
  let transactions = []
  if (!user || user === null) transactions = await getAllLedger(page)
  else transactions = await getUserLedger(user)

  if (!transactions || !transactions.length)
    return { message: 'Success', ledger: [] }
  else {
    return { message: 'Success', ledger: transactions }
  }
}

const getTransactionData = async (transaction) => {
  let data = transaction;
  if (data?.to) {
    const user = await User.findOne({ ethAddress: data.to }).exec();
    data.user = {
      image: user?.nodeID,
      name: user?.username,
    };
  }
  if (data?.tokenAddress) {
    const token = await Token.findOne({ address: data.tokenAddress }).exec();
    data.token = {
      image: `/api/routes/media/image/${token?.icon?.url}`,
      name: token?.name,
    };
  }
  return data;
};

async function getAllBlockchainTransactions() {
  try {
    const transactions = await BlockchainTransaction.find({}).exec();
    let mappedTransactions = [];
    for await (let transaction of transactions) {
      const mappedTransaction = await getTransactionData(transaction);
      mappedTransactions.push(mappedTransaction);
    }
    return mappedTransactions;
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = {
  getAllUserLedger,
  getAllBlockchainTransactions,
  getAllUserTransactions,
}
