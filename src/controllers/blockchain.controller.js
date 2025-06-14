const express = require('express');
const BlockchainService = require('../services/Blockchain/blockchain.service');
const authGuard = require('../middleware/auth.guard');
const brandGuard = require('../middleware/brand.guard');

const router = express.Router();
const blockchainService = new BlockchainService();

router.get('/eth/price', async (req, res) => {
  const result = await blockchainService.getEthPrice();
  res.json(result);
});

router.get('/balance', authGuard, async (req, res) => {
  const result = await blockchainService.getBalance(req.user);
  res.json(result);
});

router.get('/has-nft/:tokenId', authGuard, async (req, res) => {
  const result = await blockchainService.checkNFTOwnership(req.user, req.params.tokenId);
  res.json(result);
});

router.post('/nft', authGuard, async (req, res) => {
  const result = await blockchainService.createNFT(req.user, req.body);
  res.json(result);
});

router.post('/nft/batch', authGuard, brandGuard, async (req, res) => {
  const result = await blockchainService.batchMintNFTs(req.body);
  res.json(result);
});

router.patch('/nft/:tokenId/tradability', authGuard, brandGuard, async (req, res) => {
  const result = await blockchainService.updateTradability(req.params.tokenId, req.body.tradable);
  res.json(result);
});

router.post('/nft/:tokenId/royalty', authGuard, brandGuard, async (req, res) => {
  const result = await blockchainService.setRoyaltyReceiver(
    req.params.tokenId,
    req.body.receiver,
    req.body.fee
  );
  res.json(result);
});

module.exports = router;
