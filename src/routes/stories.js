const StoryService = require('../services/Story/story')
const authentication = require('../middleware/authentication')
const authorization = require('../middleware/authorization')

var express = require('express')
var router = express.Router()

router.get('/get', authentication.isAuthenticated, (req, res) => StoryService.getStories(req, res))
router.post('/create', authentication.isAuthenticated, authorization.isBrand, (req, res) => StoryService.createStory(req, res))
router.put('/update', authentication.isAuthenticated, authorization.isBrand, (req, res) => StoryService.updateStory(req, res))

module.exports = router