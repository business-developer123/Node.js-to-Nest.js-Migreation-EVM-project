const Brand = require('../../models/brand')
const Game = require('../../models/game')
const GameSave = require('../../models/gameSave')
const Mongoose = require('mongoose')
const ObjectId = Mongoose.Types.ObjectId;
const Story = require('../../models/story')
const Product = require('../../models/product')
const Token = require('../../models/token')
const User = require('../../models/user')
const BlockchainTransaction = require('../../models/blockchainTransaction');
const ObjectSymbol = require('../../models/objectSymbol')
const { DIRECT, INDIRECT } = require('../../constants/chatQueryType');
const userType = require('../../constants/userType')
const gameStatus = require('../../constants/gameStatus');
const Twillio = require('../Twilio/twillio');
const emailService = require("../Email/email");

async function createGame(gameData) {
  let brand = await Brand.findOne({ email: gameData.brandEmail })
  if (!brand) {
    return { message: 'Brand not found', status: 500 }
  }
  let brandPendingGames = await Game.find({ brandId: brand._id, state: gameStatus.PENDING }).exec()
  if (brandPendingGames.length > 5) {
    //return { message : 'You fullfilled your 15 games qouta for this cycle', status: 500 }
  }

  let gameSymbol = await ObjectSymbol.findOne({ category: gameData.game_type.toLowerCase() })
  if (!gameSymbol) {
    return { message: 'Couldn\'t find symbol for game', status: 500 }
  }

  const story = await Story.findOne({_id: ObjectId(gameData.story_id)});
  if (!story){
    return { message: 'Story not fond', status: 500 }
  }
  let drrtToken;

  if(gameData.tokenId){
    drrtToken = await Token.findOne({_id: ObjectId(gameData.tokenId)});
  }
  // var product = await Product.findById({ _id: ObjectId(gameData.product_id) }).exec()
  // if (product === null) {
  //   console.log(`Failed to find product ${gameData.product_id}.`)
  //   return { message: 'Failed to find product', status: 500 }
  // }
  //
  // const token = await Token.findById({ _id: ObjectId(product.tokenId) }).exec();
  // if (token === null) {
  //   console.log(`Failed to find token ${product.tokenId}.`)
  //   return { message: 'Failed to find token', status: 500 }
  // }
  //
  // const transactions = await BlockchainTransaction.find({ tokenAddress: token.address }).exec();
  // if (transactions === null || transactions?.length === 0) {
  //   console.log(`Failed to find transactions ${product?.token?.address}.`)
  //   return { message: 'Failed to find transactions', status: 500 }
  // }

  // const transactionUsersAddresses = transactions.map((t) => t.to);
  // const filters = { ethAddress: { $in: transactionUsersAddresses } };
  //
  // FIXME this were hidden because we decided to make games only for DRRT token owners.
  //
  // const filters = {};
  // filters['$and'] = [];
  // filters['$and'].push({ verified: true },
  //   // { type: userType.PUSHUSER }
  // )
  // if (gameData.queryType === DIRECT) {
  //   gameData.filters.forEach(element => {
  //     filters[element.key] = { '$in': element.value };
  //   });
  // } else if (gameData.queryType === INDIRECT) {
  //   if (gameData.filters.length > 0) {
  //     filters['$or'] = [];
  //     gameData.filters.forEach(element => {
  //       element.value.forEach(value => {
  //         const filter = {};
  //         filter[element.key] = value;
  //         filters['$or'].push(filter);
  //       });
  //     });
  //   }
  // }

  if (gameData.usersToShow.length < 1) {
    return { message: 'Not enough players to create game.', status: 500 }
  }
  const users = await User.find({ onboarding: true, role: 'user' }).exec();
  const forAllUsers = users.length === gameData.usersToShow.length;

  let brandGames = await Game.find({ brandId: brand._id })
  let profitPercentage = 100;
  if (brandGames.length) {
    profitPercentage = 100 / (brandGames.length + 1)
    for (let brandGame of brandGames) {
      brandGame.profitPercentage = profitPercentage
      brandGame.markModified('profitPercentage')
      await brandGame.save()
    }
  }

  const session = await Mongoose.startSession()
  session.startTransaction()

  let game = new Game({
    brandId: brand._id,
    storyId: story._id,
    filters: gameData.filters,
    endDate: Date.now() + 86400000,
    mission: gameData.mission,
    profitPercentage: profitPercentage,
    name: gameData.name,
    numPlayers: gameData.usersToShow.length,
    symbol: gameSymbol.symbolUrl,
    // productId: product._id,
    // productDetail: gameData.productDetail,
    productContext: gameData.productContext,
    compensation: gameData.compensation,
    description: gameData.description,
    poolAmount: gameData.poolAmount,
    rules: gameData.rules,
    state: gameStatus.PENDING,
    type: gameData.game_type,
    usersToShow: gameData.usersToShow,
    startTime: gameData.startTime,
    playTime : gameData.playTime,
    voteTime : gameData.voteTime,
    isPlayTimeExtended: false,
    isVoteTimeExtended: false,
    token: drrtToken,
    tokenID: gameData.tokenId || null,
    idOfToken: gameData.tokenId || null,
    forAllUsers,
  });
  await game.save().catch(error => {
    console.log('Unable to create game, ' + error)
    session.abortTransaction()
    session.endSession()
    return { message: 'Unable to create game', status: 500 }
  })

  console.log(game._id, 'game._id when create the new game');


  for (let u of gameData.usersToShow) {
    await new GameSave({
      seenInRanks: false,
      gameId: game._id,
      messages: ['Hey! Make a submission to this new game!'],
      player: true,
      state: 'NO_SUBMISSION',
      userId: u._id,
    }).save().catch(error => {
      console.log('Unable to create gameSave, ' + error)
      session.abortTransaction()
      session.endSession()
      return { message: 'Unable to create gameSave', status: 500 }
    });
  }

  const usersToVote = await User.find({ onboarding: true }).exec();
  for (let u of usersToVote) {
    await new GameSave({
      seenInRanks: false,
      gameId: game._id,
      messages: ['Hey! A new game has been created and will be available for voting!'],
      player: true,
      state: 'NO_SUBMISSION',
      userId: u._id,
    }).save().catch(error => {
      console.log('Unable to create gameSave, ' + error)
      session.abortTransaction()
      session.endSession()
      return { message: 'Unable to create gameSave', status: 500 }
    });
  }

  await session.commitTransaction()
  session.endSession()
  return { message: 'Game created!', status: 200 }
}



async function setGameRulesRead(userId, gameId) {
  try {
    let userGSave = await GameSave.findOne({ userId: userId, gameId: gameId }).exec()
    let game = await Game.findOne({ _id: gameId }).populate('brandId').exec()
    userGSave.rulesRead = true;
    await userGSave.save()
    return { brand: game.brandId }
  } catch (error) {
    return { brand: "" }
  }
}


async function getNewGamesForUserToTakeAction(userId) {
  let newGamesToVoteCounter = 0
  let newGamesToSubmissionCounter = 0
  let gs = await GameSave.find({ userId: userId })
  let gameIds = [];
  if (gs && gs.length) {
    for (let gameS of gs) {
      if (gameS.gameId) {
        gameIds.push(gameS.gameId);
      }
    }
  } else {
    return { gamesToVoteCounter: 0, gamesToSubmissionCounter: 0 };
  }
  var newGamesToVote = await Game.find({
    $and: [
      { _id: { $in: gameIds } },
      { endDate: { $gte: Date.now() } },
      { state: "VOTING" }
    ]
  });
  var newGamesToSubmission = await Game.find({
    $and: [
      { _id: { $in: gameIds } },
      { endDate: { $gte: Date.now() } },
      { state: "SUBMISSION" },
    ]
  });

  if (newGamesToVote.length) {
    for (game of newGamesToVote) {
      let userGameSave = await GameSave.findOne({ gameId: game.id, userId: userId, $or: [{ state: "SUBMITTED" }, { state: "NO_SUBMISSION" }] })
      if (userGameSave) {
        newGamesToVoteCounter++
      }
    }
  }
  if (newGamesToSubmission.length) {
    for (game of newGamesToSubmission) {
      let userGameSave = await GameSave.findOne({ gameId: game.id, userId: userId, state: "NO_SUBMISSION" })
      if (userGameSave) {
        newGamesToSubmissionCounter++
      }
    }
  }

  return { gamesToVoteCounter: newGamesToVoteCounter, gamesToSubmissionCounter: newGamesToSubmissionCounter };
}

async function getTokensForGame (){
  const games = await Game.find().exec();

  const usedTokenIds = games.map(game => {
    if (game.idOfToken){
      return game.idOfToken;
    }
  })
  const tokens = await Token.find({
        type: 'DRRT',
        price: { $exists: true }
      }).exec();

  const unusedTokens = tokens.filter(token => !usedTokenIds.includes(token._id.toString()));

  return { message: 'DRRT tokens', status: 200, tokens: unusedTokens }

}

async function getCompletedGames (){
  const games = await Game.find({ state: 'COMPLETE'}).exec();
  return { message: 'Completed Games', status: 200, games: games }
}

async function setUserTermsConfirm(body){
  const { userEmail, gameId } = body;
  try {
    const game = await Game.findOne({ _id: ObjectId(gameId) });
    if (!game) {
      return { message: 'Game not found', status: 404 };
    }

    const userIndex = game.usersToShow.findIndex(user => user.email === userEmail);
    if (userIndex === -1) {
      return { message: 'User not found in game', status: 404 };
    }

    game.usersToShow[userIndex].isTermsConfirmed = true;
    game.markModified('usersToShow');
    await game.save();

    return { message: 'Success', status: 200 };
  } catch (error) {
    console.error('Error in setUserTermsConfirm:', error);
    return { message: 'Internal server error', status: 500 };
  }
}


module.exports = {
  createGame,
  setGameRulesRead,
  getNewGamesForUserToTakeAction,
  getTokensForGame,
  getCompletedGames,
  setUserTermsConfirm,
}
