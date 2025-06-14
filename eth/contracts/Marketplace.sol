// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./MainToken.sol";
import "./NftToken.sol";

contract Marketplace is ReentrancyGuard {
    using SafeMath for uint256;

    // Equals to `bytes4(keccak256("onERC721Received(address,uint256,bytes)"))`
    // which can be also obtained as `ERC721Receiver(0).onERC721Received.selector`
    bytes4 constant ERC721_RECEIVED = 0xf0b9e5ba;

    address public governance;
    uint256 public price;
    uint256 public availableTokens;

    MainToken public token;

    modifier onlyGovernance() {
        require(msg.sender == governance, "only governance can call this");
        _;
    }

    constructor() {
        governance = msg.sender;
    }

    // Coin block

    struct CoinSale {
        address investor;
        uint256 amount;
        bool withdrawn;
    }

    mapping(address => CoinSale) public coinSales;

    function createCoinSale(
        address _address,
        uint256 _price,
        uint256 _availableTokens
    ) public onlyGovernance {
        token = MainToken(_address);

        require(
            _availableTokens > 0 && _availableTokens <= token.maxTotalSupply(),
            "_availableTokens should be > 0 and <= maxTotalSupply"
        );

        token.mint(address(this), _availableTokens);
        token.approve(address(this), _availableTokens);
        price = _price;
        availableTokens = _availableTokens;
    }

    function updatePrice(uint256 _price)
        public
        onlyGovernance
        returns (uint256)
    {
        price = _price;
        return price;
    }

    function buyCoin(address toAddress, uint256 amount)
        public
        nonReentrant
        onlyGovernance
    {
        require(amount <= availableTokens, "Not enough tokens left for sale");
        uint256 updatedTokenAmount = coinSales[toAddress].amount + amount;
        coinSales[toAddress] = CoinSale(toAddress, updatedTokenAmount, false);
        availableTokens = availableTokens - amount;
    }

    function useCoin(address fromAddress, uint256 amount)
        public
        nonReentrant
        onlyGovernance
    {
        require(amount <= coinSales[fromAddress].amount, "Not enough tokens");
        coinSales[fromAddress].amount = coinSales[fromAddress].amount - amount;
        availableTokens = availableTokens + amount;
    }

    function withdrawCoin(address fromAddress, address toAddress)
        public
        nonReentrant
        onlyGovernance
    {
        token.transferFrom(
            address(this),
            toAddress,
            coinSales[fromAddress].amount
        );
        coinSales[fromAddress].withdrawn = true;
    }

    // NFT block

    struct NftSale {
        uint256 tokenId;
        address owner;
        uint256 price;
        uint256 assets;
        bool sold;
        bool withdrawn;
    }

    mapping(address => mapping(uint256 => NftSale)) public nftSales;
    mapping(address => uint256) public nftSaleTokenId;

    function createNftSale(
        address _address,
        uint256 _price,
        uint256 _assets
    ) public nonReentrant onlyGovernance {
        NftToken nftToken = NftToken(_address);
        uint256 _availableTokens = 1;

        if (nftToken.tradable()) {
            price = price + ((_price * 10**18) * 3) / token.maxTotalSupply();
            _availableTokens = 3;
            // nftToken.batchMint(3, address(this));
            nftSaleTokenId[_address] = 4;
        } else {
            price = price + (_price * 10**18) / token.maxTotalSupply();
            // nftToken.mint(address(this), "");
        }

        for (uint8 counter = 0; counter < _availableTokens; counter++) {
            uint256 tokenId = counter + 1;
            nftSales[_address][tokenId] = NftSale(
                tokenId,
                address(0),
                _price,
                _assets,
                false,
                false
            );
        }
    }

    function mintNft(address _address, uint256 _count)
        public
        nonReentrant
        onlyGovernance
    {
        NftToken nftToken = NftToken(_address);
        nftToken.batchMint(_count, address(this));
    }

    function buyNft(
        address _address,
        uint256 _tokenId,
        address _toAddress,
        string memory _assets
    ) public nonReentrant onlyGovernance {
        nftSales[_address][_tokenId].owner = _toAddress;
        nftSales[_address][_tokenId].sold = true;
        nftSaleTokenId[_address] = _tokenId + 1;
        NftToken nftToken = NftToken(_address);
        nftToken.mint(address(this), _assets);
    }

    function updateNftPrice(
        address _address,
        uint256 _tokenId,
        uint256 _price
    ) public nonReentrant onlyGovernance {
        nftSales[_address][_tokenId].price = _price;
    }

    function withdrawNft(
        address _address,
        uint256 _tokenId,
        address _fromAddress,
        address _toAddress
    ) public nonReentrant onlyGovernance {
        require(
            nftSales[_address][_tokenId].owner == _fromAddress,
            "You are not token owner"
        );
        NftToken nftToken = NftToken(_address);
        nftToken.transferFrom(address(this), _toAddress, _tokenId);
        nftSales[_address][_tokenId].withdrawn = true;
    }

    // deposit NFT
    function onERC721Received(
        address _address,
        address _from,
        uint256 _tokenId,
        bytes calldata
    ) external returns (bytes4) {
        nftSales[_address][_tokenId].owner = _from;
        nftSales[_address][_tokenId].withdrawn = false;
        return ERC721_RECEIVED;
    }

    function balanceOf(address _address, address _account)
        public
        view
        returns (uint256)
    {
        uint256 tokenId;
        for (
            uint8 counter = 0;
            counter <= nftSaleTokenId[_address];
            counter++
        ) {
            if (
                nftSales[_address][counter].owner == _account &&
                !nftSales[_address][counter].withdrawn
            ) {
                tokenId = counter;
            }
        }
        return tokenId;
    }
}
