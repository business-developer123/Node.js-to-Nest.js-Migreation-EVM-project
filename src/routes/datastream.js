const express = require('express')
const router = express.Router()
const DatastreamService = require('../services/Datastream/datastream')

router.get('/all', (req, res) => {
    DatastreamService.getDatastream()
    .then((data) => res.status(200).send({ success: true, data: data }))
    .catch((error) => res.status(500).send({ message: error.message }))
})

module.exports = router
