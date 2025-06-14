const GetGames = require('../services/Game/GetGames')
const GetGameRanks = require('../services/Game/GetGameRanks')
const GetSubmissions = require('../services/Game/GetSubmissions')
const authentication = require('../middleware/authentication')
const MakeSubmission = require('../services/Game/MakeSubmission')
const SubmitVote = require('../services/Game/SubmitVote')
const LiveScoreService = require('../services/Game/GetLiveScores')
const GameService = require('../services/Game/GameService')
const GetUserVote = require('../services/Game/GetUserVote')
const {isBrand} = require('../middleware/authorization')

var express = require('express')
var router = express.Router()

router.post('/createGame', authentication.isAuthenticated, (req, res) => {
    let gameData = req.body
    return GameService.createGame(gameData)
        .then((data) => res.status(data.status).send({message: data.message, data: data}))
        .catch((error) => res.status(500).send({message: error.message}))
})

router.get(
    '/getAll',
    authentication.isAuthenticated,
    (req, res) => {
        return GetGames.getAll()
            .then((data) =>
                res.status(200).send({message: "Success", game: data})
            )
            .catch((error) => res.status(500).send({message: error.message}))
    }
)
router.get('/getGame', authentication.isAuthenticated, (req, res) => {
    let gameData = req.query
    return GetGames.getGame(gameData)
        .then((data) =>
            res.status(data.status).send({message: data.message, game: data.game})
        )
        .catch((error) => res.status(500).send({message: error.message}))
})

router.get(
    '/getGamesForPortal',
    authentication.isAuthenticated,
    isBrand,
    (req, res) => {
        let portal = req.query.portal
        return GetGames.getGamesForPortal(portal)
            .then((data) =>
                res
                    .status(data.status)
                    .send({
                        message: data.message,
                        token: data.token,
                        products: data.products,
                        games: data.games,
                    })
            )
            .catch((error) => res.status(500).send({message: error.message}))
    }
)

router.get(
    '/getGameDetailsForPortal',
    authentication.isAuthenticated,
    isBrand,
    (req, res) => {
        let gameId = req.query.gameId
        return GetGames.getGameDetailsForPortal(gameId)
            .then((data) =>
                res
                    .status(data.status)
                    .send({
                        message: data.message,
                        game: data.game,
                        gameSaves: data.gameSaves,
                    })
            )
            .catch((error) => res.status(500).send({message: error.message}))
    }
)

router.get('/getGameForBrand', authentication.isAuthenticated, (req, res) => {
    let gameId = req.query.game_id
    return GetGames.getGameForBrand(gameId)
        .then((data) =>
            res.status(data.status).send({message: data.message, game: data.game})
        )
        .catch((error) => res.status(500).send({message: error.message}))
})

router.get('/getGames', authentication.isAuthenticated, (req, res) => {
    const userEmail = req.user?.email;
    const tokenId = req.query.tokenId
    return GetGames.getGames(userEmail, tokenId)
        .then((data) =>
            res.status(data.status).send({message: data.message, games: data.games})
        )
        .catch((error) => res.status(500).send({message: error.message}))
})

router.get('/getProductGames', authentication.isAuthenticated, (req, res) => {
    let productId = req.query.product_id
    return GetGames.getGamesForProduct(productId)
        .then((data) =>
            res.status(data.status).send({message: data.message, games: data.games})
        )
        .catch((error) => res.status(500).send({message: error.message}))
})

router.get('/getGameRanks', authentication.isAuthenticated, (req, res) => {
    let email = req.query.email
    return GetGameRanks.execute(email)
        .then((data) =>
            res.status(data.status).send({message: data.message, games: data.games})
        )
        .catch((error) => res.status(500).send({message: error.message}))
})

router.get(
    '/getGameStatusForPortal',
    authentication.isAuthenticated,
    isBrand,
    (req, res) => {
        let brandId = req.query.brandId
        return GetGames.getGameStatusForPortal(brandId)
            .then((data) =>
                res
                    .status(data.status)
                    .send({message: data.message, gamesInPlay: data.gamesInPlay})
            )
            .catch((error) => res.status(500).send({message: error.message}))
    }
)

router.get('/getSubmissions', authentication.isAuthenticated, (req, res) => {
    let gameId = req.query.game_id
    let email = req.query.email
    return GetSubmissions.execute(gameId, email)
        .then((data) =>
            res
                .status(data.status)
                .send({message: data.message, submissions: data.submissions})
        )
        .catch((error) => res.status(500).send({message: error.message}))
})

router.post('/makeSubmission', authentication.isAuthenticated, (req, res) => {
    let submissionData = req.body
    return MakeSubmission.execute(submissionData)
        .then((data) =>
            res
                .status(data.status)
                .send({message: data.message, submission: data.submission})
        )
        .catch((error) => res.status(500).send({message: error.message}))
})

router.post('/submitVote', authentication.isAuthenticated, (req, res) => {
    let voteData = req.body
    return SubmitVote.execute(voteData)
        .then((data) =>
            res
                .status(data.status)
                .send({status: data.status, message: data.message})
        )
        .catch((error) => res.status(500).send({message: error.message}))
})

router.get('/getUserVote', authentication.isAuthenticated, (req, res) => {
    let gameId = req.query.gameId
    let userId = req.query.userId

    return GetUserVote.execute(gameId, userId)
        .then((data) =>
            res
                .status(data.status)
                .send({status: data.status, message: data.message, submissions: data.submissions})
        )
        .catch((error) => res.status(500).send({message: error.message}))
})

router.get('/getLiveScores', authentication.isAuthenticated, (req, res) => {
    let gameId = req.query.gameId
    let email = req.query.email
    return LiveScoreService.GetLiveScores(gameId, email)
        .then((data) =>
            res
                .status(data.status)
                .send({message: data.message, submissions: data.submissions})
        )
        .catch((error) => res.status(500).send({message: error.message}))
})

router.get('/usersStats', (req, res) => {
    let username = req.query.username
    return GetGames.getUserStats(username)
        .then((data) =>
            res.status(data.status).send({message: data.message, stats: data.stats})
        )
        .catch((error) => res.status(500).send({message: error.message}))
});

router.get('/getDrrtTokensForAttachToGame', (req, res)=> {
    return GameService.getTokensForGame()
        .then((data) =>
        res.status(data.status).send({message: data.message, tokens: data.tokens})
    )
        .catch((error) => res.status(500).send({message: error.message}))
});

router.get('/getCompletedGames', (req, res)=> {
    return GameService.getCompletedGames()
        .then((data) =>
        res.status(data.status).send({ message: data.message, games: data.games })
    )
        .catch((error) => res.status(500).send({message: error.message}))
});


router.post('/setUserTermsConfirm', (req, res) => {
    return GameService.setUserTermsConfirm(req.body)
        .then((data) =>
            res.status(data.status).send({ message: data.message})
        )
        .catch((error) => res.status(500).send({message: error.message}))
});

module.exports = router
