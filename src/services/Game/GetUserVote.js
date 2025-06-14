const User = require("../../models/user");
const userType = require("../../constants/userType");
const Game = require("../../models/game");
const GameSave = require("../../models/gameSave");
const S3Service = require("../S3/S3Service");

async function execute (gameId, userId){
    let user = await User.findOne({ _id: userId, type: userType.PUSHUSER }).exec()
    if (user === null) {
        return { status: 500, message: "Failed to find user.", submissions: [] }
    }
    let game = await Game.findOne({ _id: gameId }).exec()
    if (game === null) {
        return { status: 200, message: "Fail to find game.", submissions: [] }
    }

    let gameSave = await GameSave.findOne({
        gameId: game.id,
        userId: user.id,
        state: 'VOTED',
        votesCasted: {$ne: null}
    }).populate('userId');
    if (gameSave === null) {
        return {
            status: 200,
            message: `No votes from user ${user.id} to game ${game.id}`,
            submissions: []
        };
    }
    const votesCasted = gameSave['votesCasted'];
    const idArray = [];
    for (const key in votesCasted) {
        if (votesCasted.hasOwnProperty(key)) {
            idArray.push(votesCasted[key]._id);
        }
    }

    const submissions = [];
    const imgArray = await S3Service.getImagesFromBucketVotingNodeImages();

    for (const id of idArray) {
        let image = await S3Service.getRandomItemFromImageArray(imgArray);
        const gameSave = await GameSave.findOne({
            _id: id,
            submission: {$ne: ''},
            gameId: game.id
        }).populate('userId');

        submissions.push({
            email: gameSave['userId']?.email,
            content: gameSave['submission'],
            id: gameSave['id'],
            node_image:  `https://voting-node-images.s3.amazonaws.com/${image}`,
            // node_image: ngs.userId?.nodeID,
            royalty: gameSave['royalty']
        })
    }
    return { status: 200, message:"Success", submissions: submissions };
}
module.exports = { execute }
