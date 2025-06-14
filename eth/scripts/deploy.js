const TOKEN_TYPES = {
  DRRT: 0,
  IT: 1,
  PORT: 2,
}

  //  ethers = require("ethers");



const PUBLIC_KEY = "0x7265D8286775c4dD2Ee251022A6a6Fed17b7372c";

const addresses = {
  marketplaceAddress: "",
  nftTokenAddress: "",
  mainTokenAddress: ""
}
// "0x59211A68B6CD420f0b8A4A4d2539c4126A26537E" "S" "NFT" true 0 "0x59211A68B6CD420f0b8A4A4d2539c4126A26537E" "S" "0x0000000000000000000000000000000000000000"
// Deploy ERC721 Nft Token gotit
async function nftTokenDeploy(marketplaceAddress, name, symbol, tradable, tokenType, royaltiesReceiver, hash, parent) {
  
  console.log(marketplaceAddress, name, symbol, tradable, tokenType, royaltiesReceiver, hash, parent);
  const NftToken = await ethers.getContractFactory("eth/contracts/NftToken.sol:NftToken")
  const nftToken = await NftToken.deploy(marketplaceAddress, name, symbol, tradable, tokenType, royaltiesReceiver, hash, parent);
  console.log("ERC721 Smart Contract deployed to address:", nftToken.address)
  return nftToken;
}

// Deploy ERC20 Main Token
async function mainTokenDeploy(marketplaceAddress, name, symbol, maxSupply) {
  const MainToken = await ethers.getContractFactory("eth/contracts/MainToken.sol:MainToken")

  const mainToken = await MainToken.deploy(marketplaceAddress, name, symbol, maxSupply);
  console.log("ERC20 Smart Contract deployed to address:", mainToken.address)
  return mainToken;
}

// Deploy Marketplace smart contract
async function marketplaceDeploy() {
  const Marketpace = await ethers.getContractFactory("eth/contracts/Marketplace.sol:Marketplace")

  const marketpace = await Marketpace.deploy();
  console.log("LabelAsset Smart Contract deployed to address:", marketpace.address)
  return marketpace;
}

// MARKETPLACE & GOBORB

// marketplaceDeploy()
//   .then(async (response) => {
//     await mainTokenDeploy(response.address, 'GOBORB', 'GobOrb', BigInt(1234567890 * 10 ** 18).toString());
//   })
//   .catch((error) => {
//     console.error(error)
//     process.exit(1)
//   })

// PORTAL

// nftTokenDeploy(MARKETPLACE_ADDRESS, 'Good Munchie', 'Good', 0, 'PAT', PUBLIC_KEY)
//   .catch((error) => {
//     console.error(error)
//     process.exit(1)
//   })

// DRRT

setTimeout(async () => {
  const marketplaceAddress = (await marketplaceDeploy()).address;
  const mainTokenAddress = (await mainTokenDeploy(marketplaceAddress, 'GOBORB', 'GobOrb', BigInt(1234567890 * 10 ** 18).toString())).address;
  const nftTokenAddress = (await nftTokenDeploy(marketplaceAddress, 'Free The Cartoon 1 DRRT', 'FTC1DRRT', true, TOKEN_TYPES.DRRT, PUBLIC_KEY, 'https://imaginecouncil.mypinata.cloud/ipfs/QmRbzUVKtvBwNUVtjtFcSLkcNtLdYh6CGNLQ24PR2trxvb', '0x0000000000000000000000000000000000000000')).address;

  console.log(`\n\n1. marektplaceAddress: `, marketplaceAddress);
  console.log(`\n\n2. mainTokenAddress  : `, mainTokenAddress, marketplaceAddress, 'GOBORB', 'GobOrb', BigInt(1234567890 * 10 ** 18).toString());
  console.log(`\n\n3. nftTokenAddress   : `, nftTokenAddress, marketplaceAddress, `"Free The Cartoon 1 DRRT"`, 'FTC1DRRT', true, TOKEN_TYPES.DRRT, PUBLIC_KEY, 'https://imaginecouncil.mypinata.cloud/ipfs/QmRbzUVKtvBwNUVtjtFcSLkcNtLdYh6CGNLQ24PR2trxvb', '0x0000000000000000000000000000000000000000');

  addresses.mainTokenAddress = mainTokenAddress;
  addresses.marketplaceAddress = marketplaceAddress;
  addresses.nftTokenAddress = nftTokenAddress;
})

// nftTokenDeploy(MARKETPLACE_ADDRESS, 'Free The Cartoon 1 DRRT', 'FTC1DRRT', true,  TOKEN_TYPES.DRRT, PUBLIC_KEY, 'https://imaginecouncil.mypinata.cloud/ipfs/QmRbzUVKtvBwNUVtjtFcSLkcNtLdYh6CGNLQ24PR2trxvb', '0x0000000000000000000000000000000000000000')
//   .catch((error) => {
//     console.error(error)
//     process.exit(1)
//   });

// CHAPTER
// the main reason of err was async await see, marketpace contract and nfttokendeploy was running in same level
// so before end of the marketplace contract, nfttoken contract was tring to deploy so failed
// and when you wanna use async function on the outside level, you should do like this
// setTimeout
//why should i use setTimeout?
// we can't use async function directly on the outside level
// this is error. but we could do like this. 

// if we use setTimeout, then right after 0 sec, se could use async function
// then we could use await function inside the function. got it?yeah
// anyway, now fully verified so, change all the configs with these addresses.
// and send me addresses

export default addresses;