require("dotenv").config()
let GameSave = require('../../models/gameSave')
let Game = require('../../models/game')
let User = require('../../models/user')
let Transaction = require('../../models/transaction')
let ObjectService = require('../../services/Object/object')
const s3Service = require("../S3/S3Service")
const userType = require('../../constants/userType')
const gameType = require('../../constants/gameType')
const symbolKeyWords = require("../../constants/symbolKeyWords")

async function execute(submissionData) {
    let user = await User.findOne({email: submissionData.username, type: userType.PUSHUSER})
    if (!user || user === null) {
        return { status: 500, message:"Failed to find user", submission: [] }
    }

    let gameSave = await GameSave.findOne({gameId: submissionData.game_id, userId: user._id}).populate('gameId').exec()
    if (gameSave === null) {
        console.error(`Failed to find gameSave. [gameId = ${submissionData.game_id}, userId = ${user._id}]`)
        return { status: 500, message:"Failed to find game save", submission: [] }
    }

    if (gameSave.gameId.state !== 'SUBMISSION') {
        console.error('Game is not accepting submissions right now.')
        return { status: 500, message:"Game is not accepting submissions right now.", submission: [] }
    }

    if (!gameSave.player) {
        console.error(`user is not a player in this game. [gameSaveId = ${gameSave.id}]`)
        return { status: 500, message:"You're not a player in this game!", submission: [] }
    }

    let game = await Game.findById(submissionData.game_id).populate('brandId')
    console.log('game')
    if (!game || game === null) {
        return { status: 500, message:"Failed to find game.", submission: [] }
    }

    let objectCreated = await ObjectService.createObjectFromGame(submissionData, game)
    console.log('objectCreated')

    if (!objectCreated) {
        console.log("Object not created")
    }

    if (game.type === gameType.IMAGE) {
        let image = await s3Service.uploadGameImageToS3(submissionData.submission, submissionData.game_id)
        gameSave.submission = image.url
    } else {
        gameSave.submission = submissionData.submission
    }

    gameSave.submissionDate = Date.now()
    gameSave.state = 'SUBMITTED'
    await gameSave.save().catch(error => {
        console.error(`Failed to make submission. [error = ${error}]`)
        return { status: 500, message:"Failed to make submission.", submission: [] }
    })

    await new Transaction({
        user: {
            email: user.email,
            id: user.id
        },
        portal: 'Pushuser',
        reason: 'User submitted',
        symbol: [`${user.nodeID}`, symbolKeyWords.EXCHANGE, symbolKeyWords.IDEA, symbolKeyWords.TO, game.brandId.businessName],
        event: `${user.username} exchanged idea to ${game.brandId.businessName}`,
        transactionCreated: new Date()
      }).save().catch(error => console.log(`Submission saved in transactions, reason: ${error}`))

    let response = [{
        node_id: user.nodeID,
        submission: gameSave.submission,
        user_id: user._id,
      }]

    return { status: 200, message:"Successfully submitted submission!", submission: response }
}

module.exports = { execute }
