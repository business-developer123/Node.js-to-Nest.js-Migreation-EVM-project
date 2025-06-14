const { Injectable } = require('@nestjs/common');
const { ConfigService } = require('@nestjs/config');
const axios = require('axios');
const pinataSDK = require('@pinata/sdk');
const stream = require('stream');

@Injectable()
class IpfsService {
  constructor(configService) {
    this.configService = configService;

    const apiKey = this.configService.get('PINATA_API_KEY') || '';
    const secretKey = this.configService.get('PINATA_API_SECRET') || '';

    this.pinata = new pinataSDK(apiKey, secretKey);
    this.pinataUrl = 'https://imaginecouncil.mypinata.cloud/ipfs';
    this.mainWalletPublicKey = this.configService.get('BLOCKCHAIN_PUBLICKEY') || '';
    this.publicUrl = this.configService.get('URL_PUSHUSER') || '';
  }

  async pinTokenIcon(iconURL) {
    try {
      const response = await axios.get(iconURL, {
        responseType: 'stream',
      });

      const result = await this.pinata.pinFileToIPFS(response.data);
      return result;
    } catch (error) {
      throw new Error(`Pinning icon failed: ${error.message}`);
    }
  }

  async pinContractMetadata(tokenData, iconHash) {
    try {
      const metadata = {
        name: `${tokenData.name} (${tokenData.symbol})`,
        description: tokenData.description,
        image: `${this.pinataUrl}/${iconHash}`,
        external_link: `${this.publicUrl}${(tokenData?.portal || 'drrt').toLowerCase()}/${tokenData._id}`,
        seller_fee_basis_points: tokenData.seller_fee_basis_points || 25000,
        fee_recipient: this.mainWalletPublicKey,
      };

      const options = {
        pinataMetadata: {
          name: `${tokenData.portal}-${tokenData._id}-contract-metadata.json`,
        },
      };

      return await this.pinata.pinJSONToIPFS(metadata, options);
    } catch (error) {
      throw new Error(`Pinning contract metadata failed: ${error.message}`);
    }
  }

  async pinNftMetadata(tokenData, iconHash) {
    try {
      const metadata = {
        name: `${tokenData.name} (${tokenData.symbol})`,
        description: tokenData.description,
        image: `${this.pinataUrl}/${iconHash}`,
      };

      const options = {
        pinataMetadata: {
          name: `${tokenData?.portal || 'drrt'}-${tokenData._id}-nft-metadata.json`,
        },
      };

      return await this.pinata.pinJSONToIPFS(metadata, options);
    } catch (error) {
      throw new Error(`Pinning NFT metadata failed: ${error.message}`);
    }
  }
}

module.exports = { IpfsService };
