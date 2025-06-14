const PortalService = require('../services/Portal/portal')
const authentication = require('../middleware/authentication')
const authorization = require('../middleware/authorization')

var express = require('express')
var router = express.Router()

router.get('/get', (req, res) => PortalService.getPortals(req, res))
router.post('/create', authentication.isAuthenticated, authorization.isBrand, (req, res) => PortalService.createPortal(req, res))
router.put('/update', authentication.isAuthenticated, authorization.isBrand, (req, res) => PortalService.updatePortal(req, res))

module.exports = router