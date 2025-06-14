const Game = require('../models/game')
const User = require('../models/user')
const Coin = require('../models/coin')
const Tools = require('./Tools/Tools')
const userType = require('../constants/userType')
const { colors, hubs, creativities } = require('../constants/userToken')

function mode(arr) {
    return arr.sort((a, b) =>
        arr.filter(v => v === a.favoriteColor).length
        - arr.filter(v => v === b.favoriteColor).length
    ).pop();
}

async function getGlobalStats(req, res) {
    try {
        let gamesInPlay = await Game.find({state: "SUBMISSION"}).count()
        let cashedOut = await Coin.find({}, {_id: 0, usersCoins: 1})
        let coinsCashedOut = cashedOut[0].usersCoins
        let usersEngaged = await User.find({type: userType.PUSHUSER}).count()
        let favColors = await User.find({favoriteColor: {$ne: ""}}, {_id: 0, favoriteColor: 1})
        let topHub = await User.find({hub: {$ne: ""}}, {_id: 0, hub: 1})
        let hubInLead = topHub.length ? mode(topHub).hub : "New York"
        let favoriteColor = mode(favColors).favoriteColor

        var response = {
            coins_paid: coinsCashedOut,
            games_in_play: gamesInPlay,
            hub_in_lead: hubInLead ? hubInLead : "New York",
            most_popular_color: favoriteColor ? favoriteColor : "blue",
            users_engaged: usersEngaged,
            colors: colors,
            hubs: hubs,
            creativities: creativities,
        }

        return res.status(200).send({stats: response, message: "Global Stats"})
    } catch (error) {
        return res.status(500).send({message: "Global Stats hasn't retrieved"})
    }
}

module.exports = { getGlobalStats }
