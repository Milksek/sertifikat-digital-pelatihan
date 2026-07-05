const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SertifikatDigital", function () {
  let contract, owner, nonOwner, recipient;
  const TOKEN_URI = "ipfs://QmTest123";

  beforeEach(async function () {
    [owner, nonOwner, recipient] = await ethers.getSigners();
    const SertifikatDigital = await ethers.getContractFactory("SertifikatDigital");
    contract = await SertifikatDigital.deploy(
      owner.address,
      "Sertifikat Pelatihan Digital",
      "SPDW",
      owner.address,
      0
    );
    await contract.waitForDeployment();
  });

  describe("soulbound", function () {
    it("soulbound should be true and constant", async function () {
      expect(await contract.soulbound()).to.equal(true);
    });
  });

  describe("mintCertificate", function () {
    it("owner can mint", async function () {
      await contract.mintCertificate(recipient.address, TOKEN_URI);
      expect(await contract.ownerOf(0)).to.equal(recipient.address);
    });

    it("non-owner cannot mint", async function () {
      await expect(
        contract.connect(nonOwner).mintCertificate(recipient.address, TOKEN_URI)
      ).to.be.revertedWith("Not authorized");
    });

    it("mint to address(0) fails", async function () {
      await expect(
        contract.mintCertificate(ethers.ZeroAddress, TOKEN_URI)
      ).to.be.revertedWith("Recipient tidak valid");
    });

    it("mint with empty URI fails", async function () {
      await expect(
        contract.mintCertificate(recipient.address, "")
      ).to.be.revertedWith("Token URI tidak boleh kosong");
    });

    it("ownerOf is correct after mint", async function () {
      await contract.mintCertificate(recipient.address, TOKEN_URI);
      expect(await contract.ownerOf(0)).to.equal(recipient.address);
    });

    it("tokenURI is correct after mint", async function () {
      await contract.mintCertificate(recipient.address, TOKEN_URI);
      expect(await contract.tokenURI(0)).to.equal(TOKEN_URI);
    });
  });

  describe("transfer blocked (soulbound)", function () {
    it("transferFrom fails", async function () {
      await contract.mintCertificate(recipient.address, TOKEN_URI);
      await expect(
        contract.connect(recipient)["transferFrom(address,address,uint256)"](recipient.address, nonOwner.address, 0)
      ).to.be.revertedWith("Sertifikat ini adalah Kredensial Soulbound dan tidak bisa ditransfer");
    });
  });

  describe("approve blocked", function () {
    it("approve reverts", async function () {
      await contract.mintCertificate(recipient.address, TOKEN_URI);
      await expect(
        contract.approve(nonOwner.address, 0)
      ).to.be.revertedWith("Sertifikat Soulbound: Fungsi persetujuan dinonaktifkan");
    });

    it("setApprovalForAll reverts", async function () {
      await expect(
        contract.setApprovalForAll(nonOwner.address, true)
      ).to.be.revertedWith("Sertifikat Soulbound: Delegasi dinonaktifkan");
    });

    it("isApprovedForAll always returns false", async function () {
      expect(await contract.isApprovedForAll(owner.address, nonOwner.address)).to.equal(false);
    });
  });

  describe("adminBurn", function () {
    it("owner can burn", async function () {
      await contract.mintCertificate(recipient.address, TOKEN_URI);
      await contract.adminBurn(0);
      await expect(contract.ownerOf(0)).to.be.reverted;
    });

    it("non-owner cannot burn", async function () {
      await contract.mintCertificate(recipient.address, TOKEN_URI);
      await expect(
        contract.connect(nonOwner).adminBurn(0)
      ).to.be.revertedWith("Not authorized");
    });
  });
});
