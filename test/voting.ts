import {
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";

  import { expect } from "chai";
 
  import { ethers } from "hardhat";


describe("Voting_Dao", function () {

  async function deployVotingDaoFixture() {

    const [owner, addr1, addr2] = await ethers.getSigners();

    const VotingDao = await ethers.getContractFactory("Voting_Dao");

    const votingDao = await VotingDao.deploy();

    return { votingDao, owner, addr1, addr2 };
  }

  async function createElectionFixture() {
    const { votingDao, owner, addr1, addr2 } = await loadFixture(deployVotingDaoFixture);
    await votingDao.createElection("Test Election", 3600);
    await votingDao.addCandidate(0, "Candidate 1");
    await votingDao.addCandidate(0, "Candidate 2");
    return { votingDao, owner, addr1, addr2 };
  }

  describe("Election Creation and Management", function () {
    it("Should create a new election", async function () {
      const { votingDao } = await loadFixture(deployVotingDaoFixture);
      await votingDao.createElection("Test Election", 3600);
      const [title, , isActive, candidateCount] = await votingDao.getElection(0);
      expect(title).to.equal("Test Election");
      expect(isActive).to.be.true;
      expect(candidateCount).to.equal(0);
    });

    it("Should add a candidate to an election", async function () {
      const { votingDao } = await loadFixture(deployVotingDaoFixture);
      await votingDao.createElection("Test Election", 3600);
      await votingDao.addCandidate(0, "Candidate 1");
      const [name, voteCount] = await votingDao.getCandidate(0, 0);
      expect(name).to.equal("Candidate 1");
      expect(voteCount).to.equal(0);
    });

    it("Should not allow non-owners to create elections or add candidates", async function () {
      const { votingDao, addr1 } = await loadFixture(deployVotingDaoFixture);
      await expect(votingDao.connect(addr1).createElection("Test Election", 3600)).to.be.revertedWith("Only owner can call this function");
      await votingDao.createElection("Test Election", 3600);
      await expect(votingDao.connect(addr1).addCandidate(0, "Candidate 1")).to.be.revertedWith("Only owner can call this function");
    });

    it("Should allow the owner to end an election", async function () {
      const { votingDao } = await loadFixture(createElectionFixture);
      await votingDao.endElection(0);
      const [, , isActive] = await votingDao.getElection(0);
      expect(isActive).to.be.false;
    });

    it("Should not allow non-owners to end an election", async function () {
      const { votingDao, addr1 } = await loadFixture(createElectionFixture);
      await expect(votingDao.connect(addr1).endElection(0)).to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Voting", function () {
    it("Should allow a user to vote", async function () {
      const { votingDao, addr1 } = await loadFixture(createElectionFixture);
      await votingDao.connect(addr1).vote(0, 0);
      const hasVoted = await votingDao.hasVoted(0, addr1.address);
      expect(hasVoted).to.be.true;
    });

    it("Should not allow double voting", async function () {
      const { votingDao, addr1 } = await loadFixture(createElectionFixture);
      await votingDao.connect(addr1).vote(0, 0);
      await expect(votingDao.connect(addr1).vote(0, 1)).to.be.revertedWith("Already voted");
    });

    it("Should not allow voting for non-existent candidates", async function () {
      const { votingDao, addr1 } = await loadFixture(createElectionFixture);
      await expect(votingDao.connect(addr1).vote(0, 2)).to.be.revertedWith("Invalid candidate");
    });

    it("Should not allow voting on an ended election", async function () {
      const { votingDao, addr1 } = await loadFixture(createElectionFixture);
      await votingDao.endElection(0);
      await expect(votingDao.connect(addr1).vote(0, 0)).to.be.revertedWith("Election is not active");
    });
  });

  describe("Winner Determination", function () {
    async function votingCompletedFixture() {
      const { votingDao, addr1, addr2 } = await loadFixture(createElectionFixture);
      await votingDao.connect(addr1).vote(0, 0);
      await votingDao.connect(addr2).vote(0, 1);
      // Wait for the voting period to end
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);
      return { votingDao, addr1, addr2 };
    }

    it("Should update the winner correctly", async function () {
      const { votingDao } = await loadFixture(votingCompletedFixture);
      await votingDao.endElection(0);
      await votingDao.updateWinner(0, 0);
      const [winnerName, winningVoteCount] = await votingDao.getWinner(0);
      expect(winnerName).to.equal("Candidate 1");
      expect(winningVoteCount).to.equal(1);
    });

    it("Should not allow updating winner during active voting", async function () {
      const { votingDao } = await loadFixture(createElectionFixture);
      await expect(votingDao.updateWinner(0, 0)).to.be.revertedWith("Voting period is still active");
    });

  });
});