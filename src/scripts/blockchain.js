require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");
const BlockchainService = require("../services/Blockchain/blockchain");

mongoose.connect(process.env.MONGODB_URI, {
  useFindAndModify: false,
  retryWrites: false,
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

async function generateEthAddressForUsers() {
  try {
    const users = await User.find({ ethAddress: null });
    for (let i = 0; i < users.length; i++) {
      setTimeout(async () => {
        const user = users[i];
        const ethAddress = await BlockchainService.generateAddress();
        user.ethAddress = ethAddress.address;
        user.save();
      }, i * 500);
    }
  } catch (error) {
    console.log(error);
  }
}

generateEthAddressForUsers();
