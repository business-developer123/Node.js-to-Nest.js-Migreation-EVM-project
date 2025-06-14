const S3Service = require('../services/S3/S3Service');
const express = require('express');
const router = express.Router();

router.post('/generate-upload-url', (req, res) => {
    S3Service.generateUploadUrl(req)
        .then(result => res.status(result.status).send(result))
        .catch(error => res.status(500).send({ message: error.message }));
})
router.post('/log-upload', (req, res) => {
    S3Service.logUpload(req)
        .then(result => res.status(result.status).send(result))
        .catch(error => res.status(500).send({ message: error.message }));
})

module.exports = router