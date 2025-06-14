var Game = require('../../models/game')
var GameSave = require('../../models/gameSave')
var User = require('../../models/user')
let userType = require('../../constants/userType')
const S3Service = require("../S3/S3Service");
const Mongoose = require("mongoose");
const ObjectId = Mongoose.Types.ObjectId;

async function execute(gameId, email) {
    var game = await Game.findById(gameId).exec()
    if (game === null) {
        return { status: 200, message:"Fail", submissions: [] }
    }

    const filter = {
        gameId: ObjectId(game.id),
        submission: {$ne: ""},
    };

    if (email) {
        var user = await User.findOne({email: email, type: userType.PUSHUSER}).exec()
        if (user === null) {
            console.log('Failed to find user.')
            return { status: 500, message:"Failed to find user", submissions: [] }
        }
    }

    const gameSaves = await GameSave.find(filter).populate('userId').exec();
    const submissions = []
    //let limit = req.query.limit ? req.query.limit : gameSaves.length
    gameSaves.sort((a, b) => b.numberOfTimesDisplayedInVotes - a.numberOfTimesDisplayedInVotes);
    // let newGameSaves = gameSaves.slice(-6) //limit to get 6 submissions
    for (let ngs of gameSaves) {
        const img = await S3Service.getRandomNodeImageFromBucketToVoteState();
        submissions.push({
            email: ngs.userId?.email,
            content: ngs.submission,
            id: ngs.id,
            node_image:  `https://voting-node-images.s3.amazonaws.com/${img}`,
            // node_image: ngs.userId?.nodeID,
            royalty: ngs.royalty
        })
    }

    return { status: 200, message:"Success", submissions: submissions }
}

module.exports = { execute }
