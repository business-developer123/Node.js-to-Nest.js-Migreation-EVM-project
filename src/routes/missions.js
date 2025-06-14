var express = require('express');
var router = express.Router();
const authentication = require('../middleware/authentication')
const missionService = require('../services/Mission/mission')

router.post('/createMission', authentication.isAuthenticated, async function(req, res) {
  let missionData = req.body;
  return missionService.createMission(missionData)
    .then(data => res.status(data.status).send({ message: data.message, missions: data.missions }))
    .catch(error => res.status(500).json({ error: error.message }));
})

router.get('/getMissions', async function(req, res) {
  return missionService.getMissions()  
    .then(data => res.status(200).send({ message: data.message, missions: data.missions }))
    .catch(error => res.status(500).send({error: error.message}));
})

module.exports = router;