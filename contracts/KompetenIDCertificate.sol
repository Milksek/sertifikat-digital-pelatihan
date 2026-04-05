// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@thirdweb-dev/contracts/base/ERC721Base.sol";

contract KompetenIDCertificate is ERC721Base {
    bool public soulbound = true;

    constructor(
        address _defaultAdmin,
        string memory _name,
        string memory _symbol,
        address _royaltyRecipient,
        uint128 _royaltyBps
    )
        ERC721Base(_defaultAdmin, _name, _symbol, _royaltyRecipient, _royaltyBps)
    {
        // Owner is already set to _defaultAdmin by ERC721Base
    }

    // Admin burn/revoke function
    function adminBurn(uint256 tokenId) external {
        require(msg.sender == owner(), "Not authorized");
        _burn(tokenId, false);
    }

    // Batch mint to multiple unique recipients with individual URIs
    function batchMintToMultiple(address[] calldata recipients, string[] calldata uris) external {
        require(msg.sender == owner(), "Not authorized");
        require(recipients.length == uris.length, "Array lengths must match");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _setTokenURI(nextTokenIdToMint(), uris[i]);
            _safeMint(recipients[i], 1, "");
        }
    }

    // Soulbound: block transfers if enabled
    function _beforeTokenTransfers(address from, address to, uint256 startTokenId, uint256 quantity)
        internal
        override
    {
        super._beforeTokenTransfers(from, to, startTokenId, quantity);
        // Izinkan minting (dari address(0)) dan burning (ke address(0)), block transfer biasa
        if (soulbound && from != address(0) && to != address(0)) {
            revert("Sertifikat ini adalah Kredensial Soulbound dan tidak bisa ditransfer");
        }
    }

    // Enable/disable soulbound mode (admin only)
    function setSoulbound(bool _enabled) external {
        require(msg.sender == owner(), "Not authorized");
        soulbound = _enabled;
    }

    // --- SKY SCRIPSI: SECURITY HARDENING ---
    // Mencegah contract "nakal" mencoba meminta izin (approval) untuk me-manage kredensial
    // Menghilangkan celah phishing pada SBT
    function approve(address, uint256) public virtual override {
        revert("Sertifikat Soulbound: Fungsi persetujuan dinonaktifkan!");
    }

    function setApprovalForAll(address, bool) public virtual override {
        revert("Sertifikat Soulbound: Delegasi dinonaktifkan!");
    }

    function getApproved(uint256) public view virtual override returns (address) {
        return address(0);
    }

    function isApprovedForAll(address, address) public view virtual override returns (bool) {
        return false;
    }
    // ---------------------------------------
}
