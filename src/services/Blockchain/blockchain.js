const { Injectable } = require('@nestjs/common');
const axios = require('axios');
const Web3 = require('web3');
const Contract = require('web3-eth-contract');
require('dotenv').config();

const nftContractArtifacts = require('../../../eth/artifacts/eth/contracts/NftToken.sol/NftToken.json');
const { abi: mainAbi } = require('../../../eth/artifacts/eth/contracts/MainToken.sol/MainToken.json');
const { abi: nftAbi } = require('../../../eth/artifacts/eth/contracts/NftToken.sol/NftToken.json');
const { abi: marketplaceAbi } = require('../../../eth/artifacts/eth/contracts/Marketplace.sol/Marketplace.json');

const API_URL = process.env.BLOCKCHAIN_API_URL;
const PUBLIC_KEY = process.env.BLOCKCHAIN_PUBLICKEY;
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATEKEY;
const MARKETPLACE_ADDRESS = process.env.BLOCKCHAIN_MARKETPLACE_ADDRESS;
const NFT_ADDRESS = process.env.BLOCKCHAIN_NFT_ADDRESS;

const web3 = new Web3(new Web3.providers.HttpProvider(API_URL));
Contract.setProvider(API_URL);

const TOKEN_TYPES = {
  DRRT: 0,
  COLLECTIBLE: 1,
  PORTAL: 2,
};

@Injectable()
class BlockchainService {
  async sendSignedTransaction(transactionAbi) {
    const transaction = {
      from: PUBLIC_KEY,
      to: MARKETPLACE_ADDRESS,
      gasLimit: 5000000,
      data: transactionAbi,
    };

    try {
      const signedTx = await web3.eth.accounts.signTransaction(transaction, PRIVATE_KEY);
      const hash = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      return hash;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getBalance(user) {
    if (!user.ethAddress) {
      throw new Error(`${user.username} doesn't have eth address`);
    }

    try {
      const address = user.ethAddress;
      const contract = new Contract(marketplaceAbi, MARKETPLACE_ADDRESS);
      const balance = await contract.methods.coinSales(address).call();
      return balance.amount;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getNftAddresses() {
    return { address: NFT_ADDRESS };
  }

  async getMainTokenAddress() {
    return { address: process.env.BLOCKCHAIN_MAINTOKEN_ADDRESS };
  }

  async getMainToken() {
    try {
      const coinAddress = (await this.getMainTokenAddress()).address;
      const contract = new Contract(mainAbi, coinAddress);
      const marketplaceContract = new Contract(marketplaceAbi, MARKETPLACE_ADDRESS);

      const name = await contract.methods.name().call();
      const symbol = await contract.methods.symbol().call();
      const totalSupply = await contract.methods.totalSupply().call();
      const maxTotalSupply = await contract.methods.maxTotalSupply().call();
      const price = await marketplaceContract.methods.price().call();
      const availableSupply = await marketplaceContract.methods.availableTokens().call();

      return {
        name,
        symbol,
        price: web3.utils.fromWei(price),
        totalSupply: web3.utils.fromWei(totalSupply),
        maxTotalSupply: web3.utils.fromWei(maxTotalSupply),
        availableSupply: web3.utils.fromWei(availableSupply),
        address: coinAddress,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getNftTokens(addresses = [], userEthAddress, all = false) {
    let tokens = [];
    if (!addresses.length) return [];

    for await (let address of addresses) {
      const token = await this.getNftToken(address, userEthAddress);
      if (token.isOwner || all) tokens.push(token);
    }

    return tokens;
  }

  async getNftToken(address, userEthAddress) {
    try {
      const contract = new Contract(nftAbi, address);
      const name = await contract.methods.name().call();
      const symbol = await contract.methods.symbol().call();
      const totalSupply = await contract.methods.totalSupply().call();
      const metadata = await contract.methods.tokenURI(1).call();

      const metaResponse = await axios.get(
        metadata.replace('gateway.pinata.cloud', 'imaginecouncil.mypinata.cloud'),
        { headers: { Accept: 'text/plain' } }
      );

      const marketplaceContract = new Contract(marketplaceAbi, MARKETPLACE_ADDRESS);

      let hasToken = false;
      if (userEthAddress) {
        hasToken = await marketplaceContract.methods.balanceOf(address, userEthAddress).call();
      }

      const tokenId = await marketplaceContract.methods.nftSaleTokenId(address).call();
      const { price } = await marketplaceContract.methods.nftSales(address, 1).call();

      return {
        address,
        assets: 1,
        name,
        symbol,
        price: web3.utils.fromWei(price),
        description: metaResponse?.data?.description,
        totalSupply,
        tokenId,
        tokenType: 0,
        isOwner: hasToken && hasToken !== '0',
        icon: metaResponse?.data?.image?.replace('gateway.pinata.cloud', 'imaginecouncil.mypinata.cloud'),
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

async function generateAddress() {
  try {
    const addressData = ethWallet.generate();
    return {
      address: addressData.getAddressString(),
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function sendToken(req) {
  try {
    const body = req.body;
    const tokenAddress = body.nftAddress || process.env.BLOCKCHAIN_MAINTOKEN_ADDRESS;
    const amount = body.amount;
    const userEthAddress = body.userEthAddress;
    const assetsUrl = '';

    if (!userEthAddress) {
      throw new Error(
        'You do not have eth address, please contact us to get it for you and connect to your account.'
      );
    }

    const marketplaceContract = new Contract(
      marketplaceAbi,
      MARKETPLACE_ADDRESS,
    );

    let transactionAbi;

    const blockchainTransaction = new BlockchainTransaction({
      from: MARKETPLACE_ADDRESS,
      to: userEthAddress,
      tokenAddress: tokenAddress,
      amount: amount,
    });
    await blockchainTransaction.save();

    if (tokenAddress === process.env.BLOCKCHAIN_MAINTOKEN_ADDRESS) {
      console.log('main token');
      transactionAbi = await marketplaceContract.methods
        .buyCoin(userEthAddress, BigInt(amount * 10 ** 18).toString())
        .encodeABI();
    } else {
      console.log('nft token');

      const tokenId = await marketplaceContract.methods
        .nftSaleTokenId(tokenAddress)
        .call();

      if (!tokenId) {
        throw new Error("NFT sale isn't started yet.");
      }

      transactionAbi = await marketplaceContract.methods
        .buyNft(tokenAddress, tokenId, userEthAddress, assetsUrl)
        .encodeABI();
    }

    await sendSignedTransaction(transactionAbi);

    blockchainTransaction.success = true;
    await blockchainTransaction.save();

    return { success: true };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function sendTokenToUser(nftAddress, amount, userEthAddress, assetsUrl = '') {
  const tokenAddress = nftAddress || process.env.BLOCKCHAIN_MAINTOKEN_ADDRESS;
  try {
    if (!userEthAddress) {
      throw new Error(
        'You do not have eth address, please contact us to get it for you and connect to your account.'
      );
    }

    const marketplaceContract = new Contract(
      marketplaceAbi,
      MARKETPLACE_ADDRESS,
    );

    let transactionAbi;

    const blockchainTransaction = new BlockchainTransaction({
      from: MARKETPLACE_ADDRESS,
      to: userEthAddress,
      tokenAddress: tokenAddress,
      amount: amount,
    });
    await blockchainTransaction.save();

    if (tokenAddress === process.env.BLOCKCHAIN_MAINTOKEN_ADDRESS) {
      console.log('main token');
      transactionAbi = await marketplaceContract.methods
        .buyCoin(userEthAddress, BigInt(amount * 10 ** 18).toString())
        .encodeABI();
    } else {
      console.log('nft token');

      const tokenId = await marketplaceContract.methods
        .nftSaleTokenId(tokenAddress)
        .call();

      if (!tokenId) {
        throw new Error("NFT sale isn't started yet.");
      }

      transactionAbi = await marketplaceContract.methods
        .buyNft(tokenAddress, tokenId, userEthAddress, assetsUrl)
        .encodeABI();
    }

    await sendSignedTransaction(transactionAbi);

    blockchainTransaction.success = true;
    await blockchainTransaction.save();

    return { success: true };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function checkIfTokenSaleStarted(tokenAddress) {
  try {
    const marketplaceContract = new Contract(
      marketplaceAbi,
      MARKETPLACE_ADDRESS,
    );
    const tokenId = await marketplaceContract.methods
      .nftSaleTokenId(tokenAddress)
      .call();

    if (!tokenId) {
      throw new Error("Token sale haven't started yet.");
    }
    return true;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function buyTokenWithGoborb(userEthAddress, cost) {
  try {
    const marketplaceContract = new Contract(
      marketplaceAbi,
      MARKETPLACE_ADDRESS,
    );
    
    const paymentTransaction = await marketplaceContract.methods
      .useCoin(userEthAddress, BigInt(cost * 10 ** 18).toString())
      .encodeABI();
    await sendSignedTransaction(paymentTransaction);
    return true;
  } catch (e) {
    throw new Error(e.message);
  }
}

module.exports = {
  BlockchainService,
};
