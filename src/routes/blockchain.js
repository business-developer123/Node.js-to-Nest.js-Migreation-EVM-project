const express = require('express');
const router = express.Router();

const BlockchainService = require('../services/Blockchain/blockchain.service');
const authMiddleware = require('../middleware/authentication');
const brandMiddleware = require('../middleware/authorization');

const blockchainService = new BlockchainService();


router.get('/eth/price', async (req, res) => {
  try {
    const data = await blockchainService.getEthPrice();
    res.send(data);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const data = await blockchainService.getBalance(req.user);
    res.send({ data });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});


router.get('/has-nft/:tokenId', authMiddleware, async (req, res) => {
  try {
    const result = await blockchainService.checkNFTOwnership(req.user, req.params.tokenId);
    res.send({ owned: result });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});


router.post('/nft', authMiddleware, async (req, res) => {
  try {
    const result = await blockchainService.createNFT(req.user, req.body);
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});


router.post('/nft/batch', authMiddleware, brandMiddleware, async (req, res) => {
  try {
    const result = await blockchainService.batchMintNFTs(req.body);
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});


router.patch('/nft/:tokenId/tradability', authMiddleware, brandMiddleware, async (req, res) => {
  try {
    const result = await blockchainService.updateTradability(req.params.tokenId, req.body.tradable);
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});


router.post('/nft/:tokenId/royalty', authMiddleware, brandMiddleware, async (req, res) => {
  try {
    const result = await blockchainService.setRoyaltyReceiver(req.params.tokenId, req.body.receiver, req.body.fee);
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

module.exports = router;
