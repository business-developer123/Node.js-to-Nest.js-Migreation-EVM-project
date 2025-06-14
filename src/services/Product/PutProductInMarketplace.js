const Game = require('../../models/game')
const GameSave = require('../../models/gameSave')
const Mongoose = require('mongoose')
const Product = require('../../models/product')
const Brand = require('../../models/brand')
const Transaction = require('../../models/transaction')

const productStates = require('../../constants/productStates')

async function execute(req, res) {
    let productId = req.body.productId
    let brand = await Brand.findOne({email: req.body.brandEmail})
    var product = await Product.findById(productId).exec()

    if (product == null || product.brandId.toString() !== brand._id.toString()) {
        console.error(`Failed to find product ${productId}.`)
        return res.status(500).send({ message : 'Failed to find product.'})
    }

    var gamesPlayed = await Game.find({ productId: product.id, state: productStates.COMPLETE }).exec()
    var gamesInPlay = await Game.find({ productId: product.id, state: { $nin: [productStates.COMPLETE, productStates.FAILED] } }).exec()
    if (gamesPlayed.length < 1 || gamesInPlay.length > 0 || product.state !== productStates.REVIEW) {
            console.error(`Product is not ready to be put in marketplace. [productId = ${product.id}, 
            gamesPlayed = ${gamesPlayed.length}, gamesInPlay = ${gamesInPlay.length}]`)
        return res.status(500).send({ message : 'Product is not ready to be put in marketplace.' })
    }
    
    var royalties = {}
    for (game of gamesPlayed) {
        var gameSaves = await GameSave.find({ gameId: game.id, votes: { $ne: null } }).exec()
        for (gameSave of gameSaves) {
            if (royalties[gameSave.userId] == null) {
                royalties[gameSave.userId] = Math.floor(gameSave.royalty / gamesPlayed.length)
            } else {
                royalties[gameSave.userId] += Math.floor(gameSave.royalty / gamesPlayed.length)
            }
        }
    }

    product.royalties = royalties
    product.state = productStates.SELLING
    product.markModified('royalties')

    const session = await Mongoose.startSession()
    session.startTransaction()
    await product.save().catch(error => {
        session.abortTransaction()
        session.endSession()
        console.error('Unable to put product in marketplace. ' + error)
        return res.status(500).send({ message : 'Unable to put product in marketplace. ' + error })
    })
    await new Transaction({
        productId: product.id,
        portal: 'ppw',
        reason: 'product in marketplace',
        event: `Putting product ${product.name} in marketplace.`,
        transactionCreated: new Date()
    }).save().catch(error => {
        session.abortTransaction()
        session.endSession()
        console.error('Unable to put product  in marketplace. ' + error)
        return res.status(500).send({ message : 'Unable to put product in marketplace. ' + error })
    })
    await session.commitTransaction()
    session.endSession()
    return res.status(200).send({ message: 'Success' })
}

module.exports = { execute }
