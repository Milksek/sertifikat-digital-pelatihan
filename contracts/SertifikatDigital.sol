// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@thirdweb-dev/contracts/base/ERC721Base.sol";

contract SertifikatDigital is ERC721Base {
    bool public constant soulbound = true;

    constructor(
        address _defaultAdmin,
        string memory _name,
        string memory _symbol,
        address _royaltyRecipient,
        uint128 _royaltyBps
    )
        ERC721Base(_defaultAdmin, _name, _symbol, _royaltyRecipient, _royaltyBps)
    {}

    function _mintTo(address recipient, string memory uri) internal {
        require(recipient != address(0), "Recipient tidak valid");
        require(bytes(uri).length > 0, "Token URI tidak boleh kosong");

        uint256 tokenId = nextTokenIdToMint();

        _setTokenURI(tokenId, uri);
        _safeMint(recipient, 1, "");
    }

    function mintCertificate(address recipient, string calldata uri) external {
        require(msg.sender == owner(), "Not authorized");

        _mintTo(recipient, uri);
    }

    function adminBurn(uint256 tokenId) external {
        require(msg.sender == owner(), "Not authorized");

        _burn(tokenId, false);
    }

    function _beforeTokenTransfers(
        address from,
        address to,
        uint256 startTokenId,
        uint256 quantity
    )
        internal
        override
    {
        super._beforeTokenTransfers(from, to, startTokenId, quantity);

        if (from != address(0) && to != address(0)) {
            revert("Sertifikat ini adalah Kredensial Soulbound dan tidak bisa ditransfer");
        }
    }

    function approve(address, uint256) public virtual override(ERC721A, IERC721) {
        revert("Sertifikat Soulbound: Fungsi persetujuan dinonaktifkan");
    }

    function setApprovalForAll(address, bool) public virtual override(ERC721A, IERC721) {
        revert("Sertifikat Soulbound: Delegasi dinonaktifkan");
    }

    function isApprovedForAll(address, address) public view virtual override(ERC721A, IERC721) returns (bool) {
        return false;
    }
}
