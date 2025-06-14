var express = require('express')
var router = express.Router()
const authentication = require('../middleware/authentication')
const authorization = require('../middleware/authorization')
const TransactionService = require('../services/Transaction/transaction')
const TokenService = require('../services/Token/token')

router.get('/ledger', (req, res) => {
  const { page, userEmail } = req.query;
  TransactionService.getAllUserLedger(userEmail, page)
    .then((data) =>
      res.status(200).send({ message: data.message, ledger: data.ledger })
    )
    .catch((error) => res.status(500).send({ message: error.message }))
})

router.get('/blockchain', authentication.isAuthenticated, authorization.isBrand, (req, res) => {
  TransactionService.getAllBlockchainTransactions()
    .then((data) => res.status(200).send({ data }))
    .catch((error) => res.status(500).send({ message: error.message }))
})

router.post('/mint/:id', authentication.isAuthenticated, authorization.isBrand, (req, res) => {
  TokenService.mintTokenForUser(req.params.id)
    .then((data) => res.status(200).send({ data }))
    .catch((error) => res.status(500).send({ message: error.message }))
})

module.exports = router
