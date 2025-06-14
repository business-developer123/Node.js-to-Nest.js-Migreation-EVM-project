const StripeClient = require('../Stripe/Client')
const Transaction = require('../../models/transaction')
const User = require('../../models/user')
const Brand = require('../../models/brand')
const GpcAccount = require('../../models/gpcAccount')
const emailService = require('../Email/email')
const emailTypes = require('../../constants/emailType');
const coinService = require('../Coin/coin')
const gpc = require('../Gpc/gpc')
const TransactionType = require("../../constants/transactionType");

async function addBank(bankUser, bankNumbers) {
    let { accountNumber, routingNumber } = bankNumbers;

    if (!bankUser.stripeAccountID) {
        return { message : `Stripe account does not exist. email: ${bankUser.email}` , status: 500}
    }

    await StripeClient.addBankAccount(bankUser.stripeAccountID, accountNumber, routingNumber)
        .catch((error) => {
            return { message : `Failed to add bank account in Stripe. [error = ${error}]`, status: 500}
        })

    bankUser.bank = true
    await bankUser.save().catch((error) => {
        console.error(`Failed to set update for user - email: ${bankUser.email}. [error = ${error}`)
    })

    return { message : 'Success!' , status: 200}
}

async function addDebitCard(bankUser, token) {

    if (!brand.stripeAccountID) {
        return { message : `Stripe account does not exist. email: ${bankUser.email}` , status: 500}
    }

    await StripeClient.addDebitCard(bankUser.stripeAccountID, token)
        .catch((error) => {
            return { message : `Failed to add debit card in Stripe. [error = ${error}]`, status: 500 }
        })

    bankUser.card = true
    await bankUser.save().catch((error) => {
        console.error(`Failed to set update for user - email: ${bankUser.email}. [error = ${error}]`)
    })

    return { message : 'Success!', status: 200 }
}

async function cashOut(brandUser, user = false, brand = false) {
    let bankUser;
    if (brand) {
        bankUser = await Brand.findOne({email: brandUser.email})
    } else if (user) {
        bankUser = await User.findOne({email: brandUser.email, type: brandUser.type})
    }
    let errMessage = ''
    let externalAccountId
    if (!bankUser.stripeAccountID) {
        return { message : `Stripe account does not exist. email: ${bankUser.email}`, status :500 }
    }

    let amount = parseInt(bankUser.coinCount)

    if (bankUser.bank) {
        externalAccountId = await StripeClient.getBankAccount(bankUser.stripeAccountID)
            .catch((error) => errMessage = `Failed to get bank account info. [error = ${error}]`)
    } else if (bankUser.card) {
        externalAccountId = await StripeClient.getCardAccount(bankUser.stripeAccountID)
        .catch((error) => errMessage = `Failed to get debit card. [error = ${error}]`)
    } else {
        errMessage = "Seems like you don\'t have bank/card info, please contact us for more details"
    }
    
    await StripeClient.payoutAccount(bankUser.stripeAccountID, amount, externalAccountId)
    .catch((error) => errMessage = `Failed to make payout. [error = ${error}]`  )
    
    if (errMessage.length > 0) {
        console.log('errMessage', errMessage)
        return { message: errMessage, status: 500 }
    }
    await emailService.sendMail(bankUser, emailTypes.PAYOUT_SUCCESSFUL, 'pushuserBank');
    let cashedOutCoins = parseInt(bankUser.coinCount)
    // bankUser.coinCount = 0
    await bankUser.save().catch((error) => {
        console.log('failed to set update for user')
        return { message: `Failed to set update for user - email: ${bankUser.email}. [error = ${error}]`, status: 500 }
    })
    
    const transactions = await Transaction.find({
        'user.email': bankUser.email,
        withdrawn: false,
        $or: [ { type: { $in: [TransactionType.DISTRIBUTION, TransactionType.ONBOARDING, TransactionType.TOKEN_SALE] } }, { event: /.*paid by.*/ }, { event: /.*completed onboarding.*/ } ]
    }).sort({ transactionCreated: -1 });

    for (const transaction of transactions) {
        transaction.withdrawn = true;
        transaction.save()
    }

    new Transaction({
        cashedOut: true,
        user: {
            email: bankUser.email,
            id: bankUser.id
        },
        coinAmonut: cashedOutCoins,
        portal: 'pushuser', //todo
        transactionCreated: new Date(),
        event: `Bank user ${bankUser.email} ${bankUser.id} has cashed out ${cashedOutCoins} points.`,
    }).save().catch((error) => {
        return { message: `Failed to save transaction. [email = ${bankUser.email}, error = ${error}]`, status: 500 }
    })
    return { message: 'Success!', status: 200 }
}

async function addAndReplaceCreditCard(data) {

    let user = await User.findOne({ email: data.email }).exec()
    if (user == null) {
        return { message: 'Failed to find user.', status: 500 }
    }

    let customer = await StripeClient.retrieveCustomer(user.stripeCustomerID)
        .catch(error => {
            return { message: `Failed to retrieve customer. ${error}`, status: 500 }
        })

    if (customer.sources.data[0] !== null) {
        await StripeClient.removeCard(customer)
            .catch(error => {
                return { message: `Failed to remove existing card. ${error}`, status: 500 }
            })
    }

    await StripeClient.addCard(customer, data.source_token)
        .catch(error => {
            return { message: `Failed to add card. ${error}`, status: 500 }
        })

    return { message : 'Successfully added card!', status: 200 }
}

module.exports = { addBank, addDebitCard, cashOut, addAndReplaceCreditCard }
