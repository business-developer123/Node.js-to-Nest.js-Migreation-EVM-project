const GlobalStats = require('../services/globalStats')

var express = require('express')
var router = express.Router()

router.get('/getGlobalStats', function (req,res) { GlobalStats.getGlobalStats(req, res) })

module.exports = router