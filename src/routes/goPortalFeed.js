const express = require('express');
const router = express.Router();
const GoPortalFeedService = require('../services/GoPortalFeed/goPortalFeed');
const MailService = require('../services/Email/email')

router.get('/get', (req, res) => GoPortalFeedService.getGoPortalFeed(req, res));
router.post('/create', (req, res) => GoPortalFeedService.createGoPortalFeed(req, res));
router.put('/update/:id', (req, res) => GoPortalFeedService.updateGoPortalFeed(req, res));
router.delete('/delete/:id', (req, res) => GoPortalFeedService.deleteGoPortalFeed(req, res));

router.post('/subscribe', (req, res) => MailService.sendEmailForGoUsersSubscribes(req, res));


module.exports = router;
