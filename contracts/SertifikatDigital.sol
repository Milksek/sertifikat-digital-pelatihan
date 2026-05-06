// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@thirdweb-dev/contracts/base/ERC721Base.sol";

contract SertifikatDigital is ERC721Base {
    bool public soulbound = true;

    constructor(
        address _defaultAdmin,
        string memory _name,
        string memory _symbol,
        address _royaltyRecipient,
        uint128 _royaltyBps
    )
        ERC721Base(_defaultAdmin, _name, _symbol, _royaltyRecipient, _royaltyBps)
    {}

    function adminBurn(uint256 tokenId) external {
        require(msg.sender == owner(), "Not authorized");
        _burn(tokenId, false);
    }

    function batchMintToMultiple(address[] calldata recipients, string[] calldata uris) external {
        require(msg.sender == owner(), "Not authorized");
        require(recipients.length == uris.length, "Array lengths must match");

        for (uint256 i = 0; i < recipients.length; i++) {
            _setTokenURI(nextTokenIdToMint(), uris[i]);
            _safeMint(recipients[i], 1, "");
        }
    }

    function _beforeTokenTransfers(address from, address to, uint256 startTokenId, uint256 quantity)
        internal
        override
    {
        super._beforeTokenTransfers(from, to, startTokenId, quantity);
        if (soulbound && from != address(0) && to != address(0)) {
            revert("Sertifikat ini adalah Kredensial Soulbound dan tidak bisa ditransfer");
        }
    }

    function setSoulbound(bool _enabled) external {
        require(msg.sender == owner(), "Not authorized");
        soulbound = _enabled;
    }

    function approve(address, uint256) public virtual override(ERC721A, IERC721) {
        revert("Sertifikat Soulbound: Fungsi persetujuan dinonaktifkan!");
    }

    function setApprovalForAll(address, bool) public virtual override(ERC721A, IERC721) {
        revert("Sertifikat Soulbound: Delegasi dinonaktifkan!");
    }

    function isApprovedForAll(address, address) public view virtual override(ERC721A, IERC721) returns (bool) {
        return false;
    }
}
