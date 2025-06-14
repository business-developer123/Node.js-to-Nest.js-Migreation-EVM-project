Full article: https://ethereum.org/en/developers/tutorials/how-to-write-and-deploy-an-nft/

Compile smart contract
`npx hardhat compile`

Deploy contract
`npx hardhat run eth/scripts/deploy.js`

Mint token
`node eth/scripts/mint-nft.js`

1. Compile all smart contracts
2. Deploy Marketplace smart contract
3. Deploy MainToken smart contract using Marketplace address
4. Deploy NFT token smart contract using Marketplace address
5. Start MainToken sale in Marketplace
6. Start NFT Token sale in Marketplace
