const userType = require('../../constants/userType')
var Game = require('../../models/game')
var User = require('../../models/user')
var Feed = require('../../models/feed')
var Product = require('../../models/product')
var GameSave = require('../../models/gameSave')
var ObjectId = require('mongoose').Types.ObjectId
let Token = require('../../models/token')
const gameStatus = require('../../constants/gameStatus')
const tokenStatus = require('../../constants/tokenStatus')
const productStates = require('../../constants/productStates')
const colors = require('../../constants/colors')
const hubs = require('../../constants/hubs')
const creatives = require('../../constants/creatives')
const Object = require('../../models/object')
const FeedService = require("../../services/Feed/feed");


async function getGames(userEmail, tokenId) {
  // TODO secure games only for token owners by tokenId
  let user = await User.findOne({
    email: userEmail,
    // type: userType.PUSHUSER,
  });
  if (!user || user === null) {
    return { message: 'Unable to find user', status: 500, games: [] }
  }

  var gameSaves = await GameSave.find({ userId: user.id })
    .populate({ path: 'gameId', populate: { path: 'brandId' } })
    .exec()

  var gameIds = []
  if (gameSaves && gameSaves.length > 0) {
    for (let gs of gameSaves) {
      if (gs.gameId) {
        gameIds.push(gs.gameId.id)
      }
    }
  }

  var newGamesToVote = await Game.find({
    $and: [
      { _id: { $nin: gameIds } },
      { endDate: { $gte: Date.now() } },
      { state: gameStatus.VOTING },
    ],
  })
  if (newGamesToVote && newGamesToVote.length > 0) {
    for (let game of newGamesToVote) {
      let gs = await new GameSave({
        gameId: game.id,
        state: 'NO_SUBMISSION',
        userId: user.id,
      })
        .save()
        .catch((error) => {
          console.error(
            `Unable to create GameSave. [error = ${error}, gameId = ${game.id}, userId = ${user.id}]`
          )
          return null
        })
      if (gs !== null) {
        gs.gameId = game
        gameSaves.push(gs)
      }
    }
  }

  var response = []
  for (let gs of gameSaves) {
    if (!gs.gameId || gs.gameId.state === gameStatus.FAILED) {
      continue
    }
    if (
      !gs.gameId ||
      ((gs.gameId.state === gameStatus.VOTING ||
        gs.gameId.state === gameStatus.SUBMISSION) &&
        gs.gameId.endDate < Date.now())
    ) {
      continue
    }

    var gameResponse = {}
    gameResponse.userPlayed = gs.state !== 'NO_SUBMISSION'
    gameResponse.userVoted = gs.state === 'VOTED'
    gameResponse.brand = gs.gameId.brandId.businessName
    gameResponse.brandDescription = gs.gameId.brandId.description
    gameResponse.end_date = gs.gameId.endDate
    gameResponse.game_id = gs.gameId.id
    gameResponse.game_state = gs.gameId.state
    gameResponse.game_type = gs.gameId.type
    gameResponse.mission = gs.gameId.mission
    gameResponse.name = gs.gameId.name
    // gameResponse.product = gs.gameId.productId
    gameResponse.pool_amount = gs.gameId.poolAmount
    gameResponse.rules = gs.gameId.rules
    gameResponse.state = gs.state

    response.push(gameResponse)
  }
  return { message: 'Success', status: 200, games: response }
}

async function getGame(gameData) {
  let user = await User.findOne({
    email: gameData.user,
    // type: userType.PUSHUSER,
  })
  if (!user || user === null) {
    return { message: 'Unable to find user', status: 500, game: {} }
  }

  let gameToShow = await Game.findOne({ _id: gameData.game_id }).populate(
    'brandId'
  )
  if (!gameToShow || gameToShow === null) {
    return { message: 'Unable to find game', status: 500, game: {} }
  }

  // let product = await Product.findOne({ _id: gameToShow?.productId }):
  let usersPlayed = await GameSave.count({
    gameId: gameData.game_id,
    state: { $ne: 'NO_SUBMISSION' },
  }).exec()
  let submissions = []
  let numVoted = 0
  // game is completed and viewed from ranks mode (the only way to see game, but just to be sure)
  if (gameToShow.state === gameStatus.COMPLETE && gameData.ranksMode) {
    let gs = await GameSave.findOne({
      userId: user._id,
      gameId: gameData.game_id,
    }).exec()
    if (gs) {
      gs.seenInRanks = true
      gs.save()
    } else if (!user.gamesSeenInRanks.includes(gameToShow.id)) {
      user.gamesSeenInRanks.push(gameToShow.id)
      user.save()
    }
    let gameSaves = await GameSave.find({
      gameId: gameData.game_id,
      submission: { $ne: '' },
    })
      .populate('userId')
      .exec()
    if (!gameSaves || gameSaves === null) {
      return { message: 'Unable to find game saves', status: 500, game: {} }
    }
    for (let gs of gameSaves) {
      const submission = {
        node_id: gs?.userId?.nodeID,
        submission: gs.submission,
        user_id: gs.userId,
      }
      if (gs.royalty) submission.royalty = gs.royalty
      else if (gs.percentage) submission.percentage = gs.percentage
      submissions.push(submission)
    }
    let gameResponse = {
      attempt: gameToShow.attempt,
      brandDescription: gameToShow.brandId.description,
      brand: gameToShow.brandId.businessName,
      end_date: gameToShow.endDate,
      game_id: gameToShow._id,
      game_state: gameToShow.state,
      game_type: gameToShow.type,
      brandDetail: gameToShow.brandId.brandDetail,
      mission: gameToShow.mission,
      name: gameToShow.name,
      numPlayers: gameToShow.numPlayers,
      // product: gameToShow.productId,
      pool_amount: gameToShow.poolAmount,
      rules: gameToShow.rules,
      submissions: submissions,
      productDetail: gameToShow.productDetail,
      productContext: gameToShow.productContext,
      compensation: gameToShow.compensation,
    }
    return { message: 'Game found', status: 200, game: gameResponse }
  }

  var gameSave = await GameSave.findOne({
    userId: user._id,
    gameId: gameData.game_id,
  })
    .populate({ path: 'gameId', populate: { path: 'brandId' } })
    .exec()
  if (gameSave?.state === 'VOTED') {
    var otherPlayersGS = await GameSave.find({
      gameId: gameData.game_id,
      submission: { $ne: '' },
    })
      .populate('userId')
      .exec()
    numVoted = otherPlayersGS.length
    for (let gs of otherPlayersGS) {
      let submission = {
        node_id: gs.userId?.nodeID,
        submission: gs.submission,
        user_id: gs.userId,
        royalty: gs.royalty,
        percentage: gs.percentage,
      }
      submissions.push(submission)
    }
  } else if (gameSave?.state === 'SUBMITTED') {
    let otherPlayersVoted = await GameSave.find({
      gameId: gameData.game_id,
      state: 'VOTED',
    }).exec()
    numVoted = otherPlayersVoted && otherPlayersVoted.length
    submissions.push({
      node_id: user.nodeID,
      submission: gameSave.submission,
      user_id: gameSave.userId,
    })
  } else if (gameSave?.state === 'NO_SUBMISSION') {
    let otherPlayersSubmitted = await GameSave.find({
      gameId: gameData.game_id,
      state: 'SUBMITTED',
    }).exec()
    numVoted = otherPlayersSubmitted.length
  }

  let gameResponse = {}
  gameResponse.attempt = gameToShow.attempt
  gameResponse.brandDescription = gameSave?.gameId?.brandId.description
  gameResponse.brand = gameSave?.gameId?.brandId.businessName
  gameResponse.brandDetail = gameSave?.gameId?.brandId.brandDetail
  gameResponse.end_date = gameSave?.gameId?.endDate
  gameResponse.game_id = gameSave?.gameId.id
  gameResponse.game_state = gameSave?.gameId.state
  gameResponse.game_type = gameSave?.gameId.type
  gameResponse.mission = gameSave?.gameId.mission
  gameResponse.name = gameSave?.gameId.name
  gameResponse.numPlayers = gameSave?.gameId.numPlayers
  gameResponse.numVoted = numVoted
  gameResponse.numOfUsersPlayed = usersPlayed
  // gameResponse.product = gameSave?.gameId.productId
  gameResponse.pool_amount = gameSave?.gameId.poolAmount
  gameResponse.rules = gameSave?.gameId.rules
  gameResponse.rulesRead = gameSave?.rulesRead
  gameResponse.state = gameSave?.state
  gameResponse.submissions = submissions
  gameResponse.mySubmission = gameSave?.submission
  gameResponse.product = product.name
  gameResponse.productDetail = gameSave?.gameId.productDetail
  gameResponse.productContext = gameSave?.gameId.productContext
  gameResponse.rules = gameSave?.gameId.rules
  gameResponse.compensation = gameSave?.gameId.compensation

  return { message: 'Game found', status: 200, game: gameResponse }
}

async function getGameForBrand(gameId) {
  try {
    let game = await Game.find({ _id: new ObjectId(gameId) })
    return { message: 'Success', status: 200, game: game }
  } catch (error) {
    return { message: 'Fail', status: 500, game: [] }
  }
}

const getGlobalStats = async (users) => {
  let stats = []
  for (let u of users) {
    let gPlayed = await GameSave.find({
      userId: u.id,
      state: { $nin: ['NO_SUBMISSION'] },
    })
    let gVoted = await GameSave.find({
      userId: u.id,
      state: { $nin: ['NO_SUBMISSION', 'SUBMISSION'] },
    })
    let gCompleted = await GameSave.find({
      userId: u.id,
      royalty: { $gt: 0 },
    })
    let royaltyCount = 0
    gCompleted.forEach((g) => {
      if (g.gameId?.state === gameStatus.COMPLETE) {
        royaltyCount += g.royalty
      }
    })
    stats.push({
      // user: u,
      royalty: royaltyCount,
      gPlayed: gPlayed.length,
      gVoted: gVoted.length,
    })
  }
  return stats
}

const getGlobalStatsForUser = async (users) => {
  let stats = []
  for (let u of users) {
    let gPlayed = await GameSave.find({
      userId: u.id,
      state: { $nin: ['NO_SUBMISSION'] },
    }).populate('userId')
    let gVoted = await GameSave.find({
      userId: u.id,
      state: { $nin: ['NO_SUBMISSION', 'SUBMISSION'] },
    }).populate('userId')
    let gCompleted = await GameSave.find({
      userId: u.id,
      royalty: { $gt: 0 },
    }).populate('gameId')
    let royaltyCount = 0
    gCompleted.forEach((g) => {
      if (g.gameId?.state === gameStatus.COMPLETE) {
        royaltyCount += g.royalty
      }
    })
    stats.push({
      // user: u,
      royalty: royaltyCount,
      gPlayed: gPlayed.length,
      gVoted: gVoted.length,
    })
  }
  return stats
}

async function getUserStats(username) {
  let user = await User.findOne({
    $or: [
      { email: username },
      { username: username }
    ]
  });
  let stats = []
  let users = await User.find({
    // type: userType.PUSHUSER,
    verified: true,
    verifiedEmail: true,
    onboarding: true,
  })
  if (!user || user === null) {
    stats = await getGlobalStats(users)
  } else {
    stats = await getGlobalStatsForUser(users)
  }

  return { status: 200, message: 'Success', stats: stats }
}

async function getGamesForProduct(productId) {
  try {
    let games = await Game.find({
      productId: productId,
      state: { $ne: gameStatus.FAILED },
    })
      .populate('brandId')
      .exec()
    return { status: 200, message: 'Success', games: games }
  } catch (error) {
    return { status: 500, message: 'Fail', games: [] }
  }
}

async function getGamesForPortal(portal) {
  try {
    let token = await Token.findOne({
      portal: { $regex: new RegExp(portal, 'i') },
      status: tokenStatus.DEVELOP,
    }).exec()
    let products = await Product.find({
      tokenId: token._id,
      state: productStates.DEVELOPING,
    }).exec()
    let productData = []
    for (let p of products) {
      let games = await Game.find({ productId: p._id })
      let gameStatus = []
      for (let g of games) {
        gameStatus.push({ state: g.state, id: g._id })
      }
      productData.push({
        numberOfGames: p.numberOfGames,
        productId: p.id,
        productImage: p.images[0],
        productName: p.name,
        gameStatus: gameStatus,
      })
    }
    return {
      status: 200,
      message: 'Success',
      token: token,
      products: productData,
      games: [],
    }
  } catch (error) {
    return { status: 200, message: 'Fail', token: {}, products: [], games: [] }
  }
}

async function getGameDetailsForPortal(gameId) {
  try {
    let g = await Game.findOne({ _id: gameId })
    let hub = g.filters.filter((gf) => gf.key === 'hub')
    let color = g.filters.filter((gf) => gf.key === 'color')
    let creative = g.filters.filter((gf) => gf.key === 'creative')
    const gameHubs = hub[0] ? hub[0]?.value : hubs
    const gameColors = color[0] ? color[0].value : colors
    const gameCreative = creative[0] ? creative[0]?.value : creatives
    let gSaves = await GameSave.find({ gameId: gameId })
      .populate('userId')
      .exec()
    let gameSaves = []
    for (let gs of gSaves) {
      let object = await Object.find({
        gameId: gameId,
        users: gs.userId.email.split(),
      }).exec()
      gameSaves.push({ userGs: gs, object: object[0] })
    }
    let game = {
      gameHubs: gameHubs,
      gameColors: gameColors,
      gameCreative: gameCreative,
      state: g.state,
    }
    return { status: 200, message: 'Success', gameSaves: gameSaves, game: game }
  } catch (error) {
    return { status: 500, message: 'Fail', gameSaves: [], game: {} }
  }
}

async function getGameStatusForPortal(brandId) {
  try {
    let games = await Game.find({ brandId: brandId })
    let products = await Product.find({
      brandId: brandId,
      state: productStates.DEVELOPING,
    })
    let gamesInPlay = games.some((g) => g.status === gameStatus.SUBMISSION)
    if (!gamesInPlay) {
      for (let p of products) {
        let games = await Game.find({ productId: p.id, brandId: brandId })
        if (p.numberOfGames < games.length) {
          gamesInPlay = true
          break
        }
      }
    }
    console.log('gamesInPlay', gamesInPlay)
    return { status: 200, message: 'Success', gamesInPlay: gamesInPlay }
  } catch (error) {
    return { status: 500, message: 'Fail', status: false }
  }
}

async function getAll() {
  try {
    const result = await Feed.find({})
    const feeds = [];

    for await (let feed of result) {
      const fullFeedData = await FeedService.getFeedData(feed);
      feeds.push(fullFeedData);
    }
    const gamesFullIds = feeds.map(feed => feed?.gameFull?._id);

    const filters = {
      state: 'PENDING',
      _id: { $nin: gamesFullIds}
    }
    return  Game.find(filters)
  } catch (error) {
    return { status: 500, message: 'Fail', error}
  }
}

module.exports = {
  getGames,
  getGame,
  getGameStatusForPortal,
  getGamesForPortal,
  getGamesForProduct,
  getGameDetailsForPortal,
  getGameForBrand,
  getUserStats,
  getAll,
}
