const express = require('express')
const router = express.Router()

const { isBrand } = require('../middleware/authorization');
const { isAuthenticated } = require('../middleware/authentication')
const CreateChatGame = require('../services/ChatGame/CreateChatGame');

router.post(
  '/', 
  isAuthenticated, 
  isBrand,
  CreateChatGame.execute
);

module.exports = router;
