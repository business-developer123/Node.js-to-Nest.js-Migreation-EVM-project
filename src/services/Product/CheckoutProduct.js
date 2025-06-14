const Mongoose = require('mongoose')
const Product = require('../../models/product')
const StripeClient = require('../Stripe/Client')
const Transaction = require('../../models/transaction')
const User = require('../../models/user')
const Order = require('../../models/order')
const GpcAccount = require('../../models/gpcAccount')
const NextSystemMessage = require('../chat/NextSystemMessages')
const systemMessageType = require('../../constants/systemMessageType');
const coinService = require('../Coin/coin')
const EmailService = require('../Email/email')
const symbolKeyWords = require("../../constants/symbolKeyWords")

async function buyProducts(req,res) {
    var body = req.body
    let selectedProducts = req.body.selectedProducts
    var errorMsg = ''
    let user = {}
    user = await User.findOne({ email: body.userInfo.email }).exec()
    if (user == null) {
        user = {}
        user.id = 1
        user.email = body.userInfo.email
        user.nodeID = "https://used-node-images.s3.amazonaws.com/node_design_ID_bacth2-23.png"
        console.error('Failed to find user.')
    }
    let entireCost = 0
    //check if products really exists and combine entire value
    for (sp of selectedProducts) {
        var product = await Product.findById(sp.productId).populate('brandId').exec()
        if (product === null) {
            console.error('Failed to find product.')
            errorMsg = "Failed to find product"
        }
        entireCost += product.cost
    }
    if (errorMsg !== "") {
        return res.status(500).send({ message : error})
    }
    let token = body.token
    var chargeId = await StripeClient.chargeCustomersCard(entireCost*100, token) //stripe cost is in cents
                .catch(error => errorMsg = error)
    if (errorMsg !== '') {
        console.error('Failed to charge customer, ' + errorMsg)
        return res.status(500).send({ message : 'Failed to charge customer.'})
    }
    createOrders(selectedProducts, user)
    await EmailService.sendProductBought(user.email)
    return res.status(200).send({ message : 'Success' })
}

async function createOrders(products, user) {
    for (p of products) {
        var product = await Product.findById(p.productId).populate('brandId').exec()
        if (product.size.length) {
            product.size.map(ps => ps.number.toString() === p.activeSize.number.toString() ? ps.quantity -= p.quantity : ps.quantity)
            product.markModified("size")
            product.save()
        }
        const order = new Order({
            productId: product.id,
            userId: user ? user._id : null,
            cost: product.cost,
            size: p.selectedSize,
            quantity: 1,
            color: p.selectedColor,
            name: product.name,
            description: product.description,
            image: product.images[0]
        })
        await order.save().catch(error => console.log(`Failed to create order, error: ${error}`))

        await new Transaction({
            purchased: true,
            user: {
                email: user.email,
                id: user.id,
                symbol: user.nodeID
            },
            from: user.nodeID,
            to: "https://nodeid.s3.amazonaws.com/imagine_council_logo.png",
            productId: product.id,
            portal: product.portal,
            reason: 'buying product',
            symbol: [`${user.nodeID}`, symbolKeyWords.PURCHASE, symbolKeyWords.PRODUCT], 
            event: `${user.username} is purchasing product ${product.name} for $${product.cost}`,
            transactionCreated: new Date()
        }).save().catch(error => console.error(error))
        await distributeRoyalties(product).catch((error) => console.error('Failed to distribute royalties.'))
    }
}

async function distributeConnectedRoyalties(cost, tokenAddress) {
    const session = await Mongoose.startSession()
    session.startTransaction()

    // TODO use real DRRT info and users that have it
    const users = await User.find({connectRoyalties: true})
    for (u of users) {
        let coins = Math.floor(cost * .2 * (u.royalties / 100))
        u.coinCount += coins
        await u.save().catch(error => {
            handleError(`Failed to update user ${u.id}.` + error, session)
        })
        await NextSystemMessage.getNextSystemMessage(u.email, systemMessageType.ROYALTY, {coins: coins, productName: "Token", royalty: u.royalty / 100})
        EmailService.sendUserMailForRoyalty(u.email)
        await coinService.handleCoinsForRoyalty(coins)
        await new Transaction({
            user: {
                id: u.id,
                email: u.email,
                symbol: u.nodeID
            },
            coinAmount: coins,
            productId: tokenAddress,
            portal: 'Pushuser',
            symbol: [`${u.nodeID}`, symbolKeyWords.PAY, symbolKeyWords.ROYALTY, symbolKeyWords.BY, 'bisney helix'], 
            reason: 'Paying royalty',
            event: `${u.username} paid royalties by Bisney Helix`,
            transactionCreated: new Date()
        }).save().catch(error => handleError(error))
    }

    await session.commitTransaction()
    session.endSession()
}

async function distributeRoyalties(product) {
    const session = await Mongoose.startSession()
    session.startTransaction()
    
    var price = product.cost * 100
    var royalties = product.royalties
    var totalRoyalties = 0
    for (const [userId, royalty] of Object.entries(royalties)) {
        var royaltyUser = await User.findById(userId).exec()
        if (royaltyUser == null) {
            handleError(`Failed to find user ${userId}.`, session)
        }
        var coins = Math.floor(price * .2 * (royalty / 100))
        totalRoyalties += coins
        royaltyUser.coinCount += coins
        await royaltyUser.save().catch(error => {
            handleError(`Failed to update user ${userId}.` + error, session)
        })
        await NextSystemMessage.getNextSystemMessage(royaltyUser.email, systemMessageType.ROYALTY, {coins: coins, productName: product.name, royalty: royalty / 100})
        EmailService.sendUserMailForRoyalty(royaltyUser.email)
        let gpcAcc = await GpcAccount.findOne({userId: userId})
        if (gpcAcc !== null) {
            gpcAcc.coinCount += coins
            gpcAcc.save()
        }
        await coinService.handleCoinsForRoyalty(coins)
        await new Transaction({
            user: {
                id: userId,
                email: royaltyUser.email,
                symbol: royaltyUser.nodeID
            },
            coinAmount: coins,
            productId: product.id,
            portal: 'Pushuser',
            symbol: [`${royaltyUser.nodeID}`, symbolKeyWords.PAY, symbolKeyWords.ROYALTY, symbolKeyWords.BY, product.brandId.businessName], 
            reason: 'Paying royalty',
            event: `${royaltyUser.username} paid royalties by ${product.brandId.businessName}`,
            transactionCreated: new Date()
        }).save().catch(error => handleError(error))
    }

    var coins = price - totalRoyalties
    product.brandId.coinCount += coins
    await product.brandId.save().catch(error => {
        handleError(`Failed to update brand ${product.brandId}.` + error, session)
    })
    EmailService.sendBrandMailForRoyalty(product.name, coins, product.brandId.email)

    let gpcAcc = await GpcAccount.findOne({brandId: product.brandId.id})
    if (gpcAcc !== null) {
        gpcAcc.coinCount += coins
        gpcAcc.save()
    }
    await coinService.handleCoinsDistributedToBrand(coins)
    await new Transaction({
        payingBrand: true,
        brand: {
            id: product.brandId.id,
            email: product.brandId.email
        },
        coinAmount: coins,
        portal: 'pushuser',
        productId: product.id,
        reason: 'product bought',
        symbol: [symbolKeyWords.BRAND, symbolKeyWords.PAY, `${coins}`, symbolKeyWords.FOR, symbolKeyWords.PRODUCT], 
        event: `Paying ${product.brandId.businessName} ${coins} points for product ${product.name}.`,
        transactionCreated: new Date()
    }).save().catch(error => handleError(error))

    await session.commitTransaction()
    session.endSession()
}

function handleError(error, session) {
    console.error(error)
    session.abortTransaction()
    session.endSession()
    throw error
}
module.exports = { buyProducts, createOrders, distributeConnectedRoyalties }
