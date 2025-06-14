const Mongoose = require("mongoose");
const HttpStatus = require("http-status-codes");
var bcrypt = require("bcrypt-nodejs");
var GpcAccount = require("../../models/gpcAccount");
var Transaction = require("../../models/transaction");
const userTypes = require('../../constants/userType')

function hashPassword(password) {
  let salt = bcrypt.genSaltSync();
  let hash = bcrypt.hashSync(password, salt);
  return hash;
}

async function registerGpcAccount(userData) {
 
  const session = await Mongoose.startSession();
  session.startTransaction();
  let errorMessage = "";
  let { 
    last4Acc,
    last4Card,
    firstName, 
    coinCount, 
    lastName, 
    //username, 
    type, 
    userId, 
    brandId, 
    coins, 
    email, 
    card, 
    bank,
    //password, 
    stripeAccountID } = userData;
  let account = await GpcAccount.create({
    email: email,
    firstName: firstName,
    coinCount: coins,
    lastName: lastName,
    userId: userId,
    brandId: brandId,
    type: type,
    coinCount: coinCount,
    bank: bank,
    card: card,
    last4Card: last4Card,
    last4Acc: last4Acc,
    stripeAccountID: stripeAccountID
  }).catch((error) => {
    errorMessage = `Error: Unable to create gpc account. [error = ${error}]`;
    console.log(errorMessage);
  }); 
  // let gpcAccount = await GpcAccount.register(
  //   new GpcAccount({
  //     username: username,
  //     email: email,
  //     firstName: firstName,
  //     coinCount: coins,
  //     lastName: lastName,
  //     userId: userId,
  //     brandId: brandId,
  //     type: type,
  //     password: hashPassword("123123123"),
  //     coinCount: coinCount,
  //     bank: bank,
  //     card: card,
  //     last4Card: last4Card,
  //     last4Acc: last4Acc,
  //     stripeAccountID: stripeAccountID
  //   }),
  //   password
  // ).catch((error) => {
  //   errorMessage = `Error: Unable to create gpc account. [error = ${error}]`;
  //   console.error(errorMessage);
  //   session.abortTransaction();
  //   session.endSession();
  // });
  if (errorMessage) return { message: errorMessage, status: 500 };
//UNIT = GPC ACCOUNT??
//   new Unit({
//     unitType: UnitType.USER,
//     image: user.nodeID,
//     name: user.username,
//     unitId: user._id,
//   })
//     .save()
//     .catch((error) => {
//       session.abortTransaction();
//       session.endSession();
//       return { message: `Error: Unable to create unit, ${error}`, status: 500 };
//     });

  await session.commitTransaction();
  session.endSession();
  return { message: "Success", status: 200, account: account };
}

async function getAccount(gpcUser) {
  let account = await GpcAccount.findOne({username: gpcUser.username, email: gpcUser.email})
  if (account) {
    if (!bcrypt.compareSync(gpcUser.password, account.password)) {
      return {message: 'Username and password don\'t match'};
    } else {
      return {account: account}
    }
  } else {
    return {message: "No account with that username"}
  }
}

module.exports = {
  registerGpcAccount,
  getAccount
};
