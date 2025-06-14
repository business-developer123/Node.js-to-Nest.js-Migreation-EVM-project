const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

let User = require("../../models/user")
let Game = require("../../models/game");
let GameSave = require("../../models/gameSave");
const userType = require("../../constants/userType");
const gameStatus = require("../../constants/gameStatus");

async function execute(email) {
  let user = await User.findOne({ email: email, type: userType.PUSHUSER }).exec()
  if (!user || user === null) {
    return { status: 500, message:"Failed to find user", games: [] }
  }
  let weekRange = new Date();
  weekRange.setDate(weekRange.getDate()-7);
  var games = await Game.find({ $and: [{state: gameStatus.COMPLETE}, {endDate: {$gte: weekRange}}]}).populate('brandId').exec()
  if (!games || !games.length) {
    return { status: 404, message:"No games", games: [] }
  }

  var response = [];
  for (let g of games) {
    var gameRank = {};
    gameRank.game_id = g.id;
    gameRank.name = g.name;
    gameRank.ranks = [];
    gameRank.seen = false;
    gameRank.end_date = g.endDate;
    gameRank.game_type = g.type;
    gameRank.pool_amount = g.poolAmount;
    gameRank.mission = g.mission;
    gameRank.brand = g.brandId?.businessName;
    gameRank.brandDescription = g.brandId?.description;
    gameRank.game_state = g.state;

    var gameSaves = await GameSave.find({
      gameId: g.id,
      royalty: { $ne: 0 },
    }).exec();
    if (gameSaves && gameSaves.length > 0) {
      for (let gs of gameSaves) {
        var rank = {};
        rank.submission = gs.submission;
        rank.royalty = gs.royalty;
        gameRank.ranks.push(rank);
      }
    }
    
    let userGameSave =  await GameSave.findOne({ gameId: g._id, userId: ObjectId(user._id)}).exec()
    if (userGameSave) {
      gameRank.seen = userGameSave.seenInRanks
    } else {
      gameRank.seen = user.gamesSeenInRanks.includes(g._id)
    }
    response.push(gameRank);
  }
  return { status: 200, message:"Success", games: response }
}

module.exports = { execute };
