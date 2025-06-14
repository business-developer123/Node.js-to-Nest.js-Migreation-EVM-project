/**
* @type import('hardhat/config').HardhatUserConfig
*/
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");

require("dotenv").config(); 

const ETH_API_URL = process.env.BLOCKCHAIN_API_URL;
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATEKEY;
const ETHERSCAN_API_KEY = process.env.BLOCKCHAIN_ETHERSCAN_API_KEY;

module.exports = {
  solidity: "0.8.1",
  defaultNetwork: "sepolia",
  networks: {
    hardhat: {},
    mainnet: {
      url: ETH_API_URL,
      accounts: [`0x${PRIVATE_KEY}`]
    },
    ropsten: {
      url: ETH_API_URL,
      accounts: [`0x${PRIVATE_KEY}`]
    },
    rinkeby: {
      url: ETH_API_URL,
      accounts: [`0x${PRIVATE_KEY}`]
    },
    goerli: {
      url: ETH_API_URL,
      accounts: [`0x${PRIVATE_KEY}`]
    },
    sepolia: {
      url: ETH_API_URL,
      accounts: [`0x${PRIVATE_KEY}`]
    },
  },
  paths: {
    sources: "./eth/contracts",
    tests: "./eth/test",
    cache: "./eth/cache",
    artifacts: "./eth/artifacts"
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  }
}
