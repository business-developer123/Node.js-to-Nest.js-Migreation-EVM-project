var GameSave = require('../../models/gameSave')
var User = require('../../models/user')
let userType = require('../../constants/userType')
const { calculateRanks } = require("./DistributionPhase");

async function GetLiveScores(gameId, email) {
    let user = await User.findOne({email: email, type: userType.PUSHUSER})
    if (!user || user === null) {
        return { status: 500, message:"User not fetched", submissions: [] }
    }
    const gameSave = await GameSave.findOne({ gameId: gameId});
    if (!gameSave) {
        return { status: 500, message:"gameSave not found", submissions: [] }
    }
    const { gameSaves, scores, totalScore } = await calculateRanks(gameId);
    let submissions = [];
    for (gs of gameSaves) {
        gs.royalty = Math.floor((scores[gs.id] / totalScore) * 100);
        submissions.push({
            id: gs.id,
            royalty: gs.royalty,
            user: gs.userId,
            content: gs?.submission,
        });
    }

    return { status: 200, message:"Success", submissions: submissions }
}

module.exports = { GetLiveScores }
