require("dotenv").config()
var GameSave = require('../../models/gameSave')
var Game = require('../../models/game')
var User = require('../../models/user')
var Transaction = require('../../models/transaction')
const mongoose = require('mongoose')
const userType = require('../../constants/userType')
const symbolKeyWords = require("../../constants/symbolKeyWords")

async function execute(voteData) {
    let user = await User.findOne({ email: voteData.username, type: userType.PUSHUSER })
    if (!user || user === null) {
        return { status: 500, message:"Failed to find user." }
    }

    var gameSave = await GameSave.findOne({gameId: voteData.game_id, userId: user.id}).populate('gameId').exec()
    let gameInPlay = await Game.findOne({_id: voteData.game_id}).populate('brandId').exec()
    if (gameSave == null) {
        return { status: 500, message:"Failed to find gameSave. " }
    }

    console.log('gameSave.votesCasted', gameSave.votesCasted)
    if (gameSave.votesCasted != null) {
        return { status: 500, message:"You already voted!" }
    }
    gameSave.votesCasted = {}

    if (gameSave.gameId.state != 'VOTING') {
        console.error('Game is not accepting votes right now.')
        return { status: 500, message:"Game is not accepting votes right now." }
    }

    var gameSaves = []
    for (i = voteData.vote.length; i > 0; i--) {
        var ranking = voteData.vote[i - 1]
        if (ranking == null) {
            return { status: 500, message:`Missing a rank for index: ${i}` }
        }

        if (ranking == gameSave.id) {
            return { status: 500, message:`You cant vote for your own submission!` }
        }

        var votedGameSave = await GameSave.findById(ranking).exec()
        if (votedGameSave == null) {
            return { status: 500, message:`Failed to find gameSave.` }
        }

        if (votedGameSave.votes == null) {
            votedGameSave.votes = {}
        }

        if (votedGameSave.votes[i] == null) {
            votedGameSave.votes[i] = 1
        } else {
            votedGameSave.votes[i] += 1
        }
        votedGameSave.numberOfTimesDisplayedInVotes += 1;
        gameSave.votesCasted[i] = ranking
        votedGameSave.markModified('votes')
        votedGameSave.markModified('numberOfTimesDisplayedInVotes')
        gameSaves.push(votedGameSave)
    }

    gameSave.state = 'VOTED'
    gameSave.votingDate = Date.now()
    gameSave.markModified('votesCasted')
    gameSaves.push(gameSave)
    const session = await mongoose.startSession()
    session.startTransaction()
    for (let gs of gameSaves) {
        await gs.save().catch(error => {
            session.abortTransaction()
            session.endSession()
            console.log('Unable to update GameSave, ' + error)
            return res.status(500).send({message : 'Unable to update GameSave, ' + error, status: 500})
        })
    }

    await session.commitTransaction()
    session.endSession()

    await new Transaction({
        user: {
            email: user.email,
            id: user.id
        },
        portal: 'Pushuser',
        reason: 'User voted',
        symbol: [`${user.nodeID}`, symbolKeyWords.VOTE, symbolKeyWords.ON, symbolKeyWords.USERS, symbolKeyWords.IDEA, symbolKeyWords.FOR, gameInPlay.brandId.businessName],
        event: `${user.username} voted on users ideas for ${gameInPlay.brandId.businessName}`,
        transactionCreated: new Date()
    }).save().catch(error => console.log(`User votes saved in transactions, reason: ${error}`))

    return { status: 200, message:`Successfully submitted votes!` }
}

module.exports = { execute }
