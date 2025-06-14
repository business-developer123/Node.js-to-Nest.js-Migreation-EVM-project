// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract MainToken is ERC20 {
    using SafeMath for uint256;
    address private owner;
    address public governance;
    uint256 public maxTotalSupply;

    modifier onlyGovernance() {
        require(msg.sender == governance, "only governance can call this");
        _;
    }

    constructor(
        address _governance,
        string memory name,
        string memory symbol,
        uint256 _maxTotalSupply
    ) ERC20(name, symbol) {
        owner = msg.sender;
        governance = _governance;
        maxTotalSupply = _maxTotalSupply;
        approve(_governance, _maxTotalSupply);
    }

    function updateGovernance(address newGovernance) external onlyGovernance {
        governance = newGovernance;
        approve(newGovernance, 0);
        approve(newGovernance, maxTotalSupply);
    }

    function mint(address account, uint256 amount) external onlyGovernance {
        uint256 totalSupply = totalSupply();
        require(
            totalSupply.add(amount) <= maxTotalSupply,
            "above maxTotalSupply limit"
        );
        _mint(account, amount);
    }
}
