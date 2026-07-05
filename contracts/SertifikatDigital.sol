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

    function mintCertificate(address recipient, string memory tokenUri) external {
        require(msg.sender == owner(), "Not authorized");
        require(recipient != address(0), "Invalid recipient");
        require(bytes(tokenUri).length > 0, "Token URI required");

        _setTokenURI(nextTokenIdToMint(), tokenUri);
        _safeMint(recipient, 1, "");
    }

    function adminBurn(uint256 tokenId) external {
        require(msg.sender == owner(), "Not authorized");
        _burn(tokenId, false);
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
