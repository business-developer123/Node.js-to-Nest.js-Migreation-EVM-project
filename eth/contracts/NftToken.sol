// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract NftToken is Ownable, ERC721Enumerable, ERC721URIStorage {
    uint256 public constant MAX_SUPPLY = 503;
    uint256 public constant royaltiesPercentage = 25;

    address public governance;
    bool public tradable;
    string private hash;

    string private _contractURI;
    address private _royaltiesReceiver;
    address public parentToken;

    enum TokenType {
        DRRT, // Digital Royalty Rights Token
        IT, // Imagination Token
        PORT // Portal Assets Token
    }
    TokenType public tokenType;

    mapping(uint256 => string) public assets;

    event Mint(uint256 tokenId, address recipient);

    modifier onlyGovernance() {
        require(msg.sender == governance, "only governance can call this");
        _;
    }

    constructor(
        address _governance,
        string memory name,
        string memory symbol,
        bool _tradable,
        TokenType _tokenType,
        address initialRoyaltiesReceiver,
        string memory _hash,
        address _parentToken
    ) ERC721(name, symbol) {
        governance = _governance;
        setApprovalForAll(_governance, true);
        tradable = _tradable;
        tokenType = _tokenType;
        _royaltiesReceiver = initialRoyaltiesReceiver;
        hash = _hash;
        parentToken = _parentToken;
    }

    function royaltiesReceiver() external view returns (address) {
        return _royaltiesReceiver;
    }

    function setRoyaltiesReceiver(
        address newRoyaltiesReceiver
    ) external onlyGovernance {
        require(newRoyaltiesReceiver != _royaltiesReceiver); // dev: Same address
        _royaltiesReceiver = newRoyaltiesReceiver;
    }

    function royaltyInfo(
        uint256 _tokenId,
        uint256 _salePrice
    ) external view returns (address receiver, uint256 royaltyAmount) {
        uint256 _royalties = (_salePrice * royaltiesPercentage) / 100;
        return (_royaltiesReceiver, _royalties);
    }

    function setContractURI(string calldata _newContractURI) public onlyOwner {
        _contractURI = _newContractURI;
    }

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    function updateTradable(bool _tradable) external onlyGovernance {
        tradable = _tradable;
    }

    function updateAssets(
        uint256 _tokenId,
        string memory _assets
    ) external onlyGovernance {
        assets[_tokenId] = _assets;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    function _burn(
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function tokenURI(
        uint256 tokenId
    )
        public
        view
        virtual
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function mint(
        address recipient,
        string memory _assets
    ) external onlyGovernance returns (uint256 tokenId) {
        require(totalSupply() <= MAX_SUPPLY, "All tokens minted");
        uint256 newItemId = totalSupply() + 1;
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, hash);
        assets[newItemId] = _assets;
        return newItemId;
    }

    function batchMint(
        uint256 count,
        address recipient
    ) external onlyGovernance returns (uint256 tokenId) {
        require(
            totalSupply() + count <= MAX_SUPPLY,
            "Not enough NFTs left to mint"
        );

        uint256 newItemId;
        uint256 supply = totalSupply();
        for (uint8 tempCounter = 0; tempCounter < count; tempCounter++) {
            newItemId = supply + tempCounter + 1;
            _mint(recipient, newItemId);
            _setTokenURI(newItemId, hash);
        }

        return newItemId;
    }
}
