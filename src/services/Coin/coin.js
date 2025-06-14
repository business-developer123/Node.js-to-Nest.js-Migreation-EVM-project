const Coin = require('../../models/coin');

async function handleCoinTransactions(coins = 0) {
    let coin = await Coin.find().exec()
    let systemCoin = coin[0]
    if (systemCoin.coinAmountInSystem === 0) {
      systemCoin.coinAmountInSystem = systemCoin.coinAmountFromStripe - coins
      systemCoin.usersCoins = coins;
    } else {
      systemCoin.coinAmountInSystem -= coins
      systemCoin.usersCoins += coins
    }
    await systemCoin.save()
}

async function cashOutUser(coins = 0) {
    let coin = await Coin.find().exec()
    let systemCoin = coin[0]
    let usdValue = coins/100
    systemCoin.usersCoins -= coins
    systemCoin.amountCashedOut += usdValue
    systemCoin.usdAmountInSystem -= usdValue
    systemCoin.save()
}

async function cashOutBrand(coins = 0) {
    let coin = await Coin.find().exec()
    let systemCoin = coin[0]
    let usdValue = coins/100
    systemCoin.brandsCoins -= coins
    systemCoin.amountCashedOut += usdValue
    systemCoin.usdAmountInSystem -= usdValue
    systemCoin.save()
}

async function handleDistributionPhase(coins = 0) {
    let coin = await Coin.find().exec()
    let systemCoin = coin[0]
    systemCoin.usersCoins += coins
    systemCoin.coinAmountInSystem -= coins
    systemCoin.save()
}

async function handleCoinsDistributedToBrand(coins = 0) {
    let coin = await Coin.find().exec()
    let systemCoin = coin[0]
    systemCoin.brandsCoins += coins
    systemCoin.coinAmountInSystem -= coins
    systemCoin.save()
}

async function handleCoinsForRoyalty(coins = 0) {
    let coin = await Coin.find().exec()
    let systemCoin = coin[0]
    systemCoin.usersCoins += coins
    systemCoin.coinAmountInSystem -= coins
    systemCoin.save()
}

async function brandPurchaseCoins(coins = 0) {
    let coin = await Coin.find().exec()
    let systemCoin = coin[0]
    let usdValue = coins/100
    systemCoin.brandsCoins += coins;
    systemCoin.usdAmountInSystem += usdValue
    systemCoin.save()
}

module.exports = {
    handleCoinTransactions,
    handleDistributionPhase,
    handleCoinsDistributedToBrand,
    handleCoinsForRoyalty,
    brandPurchaseCoins,
    cashOutUser,
    cashOutBrand
}