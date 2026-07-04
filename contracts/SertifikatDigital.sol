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

    // ─── Internal helper ───────────────────────────────────────────────────────
    // Dipakai oleh mintCertificate maupun batchMintToMultiple agar msg.sender
    // tidak berubah ketika satu fungsi memanggil fungsi lain (hindari masalah
    // onlyOwner di dalam this.xxx()).
    function _mintTo(address recipient, string memory uri) internal {
        uint256 tokenId = nextTokenIdToMint();
        _setTokenURI(tokenId, uri);
        _safeMint(recipient, 1, "");
    }

    // ─── Fungsi utama penerbitan sertifikat (1 peserta = 1 SBT) ───────────────
    function mintCertificate(address recipient, string calldata uri) external {
        require(msg.sender == owner(), "Not authorized");
        _mintTo(recipient, uri);
    }

    // ─── Fungsi batch (legacy, tidak digunakan oleh aplikasi) ──────────────────
    function batchMintToMultiple(address[] calldata recipients, string[] calldata uris) external {
        require(msg.sender == owner(), "Not authorized");
        require(recipients.length == uris.length, "Array lengths must match");

        for (uint256 i = 0; i < recipients.length; i++) {
            _mintTo(recipients[i], uris[i]);
        }
    }

    // ─── Cabut sertifikat (admin only) ─────────────────────────────────────────
    function adminBurn(uint256 tokenId) external {
        require(msg.sender == owner(), "Not authorized");
        _burn(tokenId, false);
    }

    // ─── Soulbound guard: blokir semua transfer antar wallet ──────────────────
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

    // ─── Nonaktifkan semua mekanisme persetujuan transfer ─────────────────────
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
