const MessageService = require('../services/Message/message')
const FeedService = require('../services/Feed/feed')
const authentication = require('../middleware/authentication')
const authorization = require('../middleware/authorization')

var express = require('express')
var router = express.Router()

router.get('/get', authentication.isAuthenticated, (req, res) => FeedService.getFeed(req, res))
router.get('/get/:feedId', authentication.isAuthenticated, (req, res) => FeedService.getFeedById(req, res))
router.post('/create', authentication.isAuthenticated, authorization.isBrand, (req, res) => FeedService.createFeed(req, res))
router.put('/update', authentication.isAuthenticated, authorization.isBrand, (req, res) => FeedService.updateFeed(req, res))
router.post('/delete', authentication.isAuthenticated, authorization.isBrand, (req, res) => FeedService.deleteFeed(req, res))

router.get('/messages/:feedId', authentication.isAuthenticated, (req, res) => MessageService.getMessages(req, res))
router.post('/message', authentication.isAuthenticated, (req, res) => MessageService.createMessage(req, res))

router.post('/like', authentication.isAuthenticated, (req, res) => MessageService.toggleLike(req, res));

router.post('/response', authentication.isAuthenticated, (req, res) => MessageService.createResponse(req, res));
router.post('/response/like', authentication.isAuthenticated, (req, res) => MessageService.toggleResponseLike(req, res))
router.put('/response/update', authentication.isAuthenticated, (req, res) => MessageService.updateResponse(req, res))

module.exports = router
