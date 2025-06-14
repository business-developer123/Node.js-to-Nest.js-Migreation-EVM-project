const express = require('express')
const router = express.Router()

// const { isAuthenticated } = require('../middleware/authentication')
const { getAudioFile, getVideoFile, getImageFile, getFileUrl } = require('../services/Media/media');

router.get('/audio/:name', getAudioFile);
router.get('/video/:name', getVideoFile);
router.get('/image/:name', getImageFile);
router.get('/file/:key/:type', getFileUrl);

module.exports = router;
