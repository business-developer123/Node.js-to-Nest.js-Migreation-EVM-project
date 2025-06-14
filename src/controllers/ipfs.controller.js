const express = require('express');
const router = express.Router();
const IpfsService = require('./ipfs.service');

const ipfsService = new IpfsService();

router.post('/pin-icon', async (req, res) => {
  try {
    const result = await ipfsService.pinTokenIcon(req.body.iconURL);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pin-contract-metadata', async (req, res) => {
  try {
    const result = await ipfsService.pinContractMetadata(req.body.tokenData, req.body.iconHash);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pin-nft-metadata', async (req, res) => {
  try {
    const result = await ipfsService.pinNftMetadata(req.body.tokenData, req.body.iconHash);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
