const { getError } = require('./utils');
require("dotenv").config();

const ETH_API_URL = process.env.BLOCKCHAIN_API_URL;

const PUBLIC_KEY = process.env.BLOCKCHAIN_PUBLICKEY
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATEKEY

const MARKETPLACE_ADDRESS = process.env.BLOCKCHAIN_MARKETPLACE_ADDRESS
const MAIN_TOKEN_ADDRESS = process.env.BLOCKCHAIN_MAINTOKEN_ADDRESS

const Web3 = require('web3');
const web3 = new Web3(ETH_API_URL)

async function startCoinSale() {
  try {
    const contractArtifact = require("../artifacts/eth/contracts/Marketplace.sol/Marketplace.json");
    const contract = new web3.eth.Contract(contractArtifact.abi, MARKETPLACE_ADDRESS);

    const transaction = {
      from: PUBLIC_KEY,
      to: MARKETPLACE_ADDRESS,
      gasLimit: 5000000,
      data: contract.methods.createCoinSale(
        MAIN_TOKEN_ADDRESS,
        '0', // BigInt(10 * 10 ** 18).toString(),
        BigInt(1000000 * 10 ** 18).toString(),
      ).encodeABI(),
    };

    return web3.eth.accounts.signTransaction(transaction, PRIVATE_KEY)
      .then((signedTx) => web3.eth.sendSignedTransaction(signedTx.rawTransaction, (err, hash) => {
        if (!err) {
          console.log(`GOBORB: The hash of transaction is: ${hash}`);
        } else {
          console.log("GOBORB: Something went wrong when submitting transaction:", getError(err))
        }
      }))
      .catch((err) => {
        console.log("GOBORB: Signing transaction failed: ", getError(err))
      })
  } catch (error) {
    console.log("GOBORB: Minting error: ", getError(error));
  }
}

async function startTokenSale(nftAddress, price, assets) {
  try {
    const contractArtifact = require("../artifacts/eth/contracts/Marketplace.sol/Marketplace.json");
    const contract = new web3.eth.Contract(contractArtifact.abi, MARKETPLACE_ADDRESS);

    const transaction = {
      from: PUBLIC_KEY,
      to: MARKETPLACE_ADDRESS,
      gasLimit: 5000000,
      data: contract.methods.createNftSale(
        nftAddress,
        price,
        assets,
      ).encodeABI(),
    };

    return web3.eth.accounts.signTransaction(transaction, PRIVATE_KEY)
      .then((signedTx) => web3.eth.sendSignedTransaction(signedTx.rawTransaction, (err, hash) => {
        if (!err) {
          console.log(`NFT: The hash of transaction is: ${hash}`);
        } else {
          console.log("NFT: Something went wrong when submitting transaction:", getError(err))
        }
      }))
      .catch((err) => {
        console.log("NFT: Signing transaction failed: ", getError(err))
      })
  } catch (error) {
    console.log("NFT error: ", getError(error));
  }
}

async function mintNftToken(nftAddress, count) {
  try {
    const contractArtifact = require("../artifacts/eth/contracts/Marketplace.sol/Marketplace.json");
    const contract = new web3.eth.Contract(contractArtifact.abi, MARKETPLACE_ADDRESS);

    const transaction = {
      from: PUBLIC_KEY,
      to: MARKETPLACE_ADDRESS,
      gasLimit: 5000000,
      data: contract.methods.mintNft(
        nftAddress,
        count,
      ).encodeABI(),
    };

    web3.eth.accounts.signTransaction(transaction, PRIVATE_KEY)
      .then((signedTx) => web3.eth.sendSignedTransaction(signedTx.rawTransaction, (err, hash) => {
        if (!err) {
          console.log(`NFT: The hash of transaction is: ${hash}`);
        } else {
          console.log("NFT: Something went wrong when submitting transaction:", getError(err))
        }
      }))
      .catch((err) => {
        console.log("NFT: Signing transaction failed: ", getError(err))
      })
  } catch (error) {
    console.log("NFT error: ", getError(error));
  }
}

// startCoinSale();

// PORT tokens
// startTokenSale('0xCF5B390b5505d2029E515C74758dd11D244d42C7', BigInt(11181818.20 * 10 ** 18).toString(), 0);
// mintNftToken('0xCF5B390b5505d2029E515C74758dd11D244d42C7', 1);

// DRRT / IT tokenTypes
// startTokenSale('0x729941Ca00202ff8e973D6d4F87EF80F4ebab4B9', BigInt(250 * 10 ** 18).toString(), 0);
// mintNftToken('0x729941Ca00202ff8e973D6d4F87EF80F4ebab4B9', 1);
