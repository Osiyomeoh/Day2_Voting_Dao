import { ethers } from "hardhat";

async function main() {
    const VotingDao = await ethers.getContractAt("Voting_Dao", "0x287ea4e5ee727AAe1f78b4387f3B22537DB88198");
    const owner = await ethers.provider.getSigner(0);
    const voter1 = await ethers.provider.getSigner(1);

    try {
        // Create a new election
        let tx = await VotingDao.connect(owner).createElection("Presidential Election", 86400);
        let receipt = await tx.wait();
        logEvent(VotingDao, receipt, "ElectionCreated");

        const electionCount = await VotingDao.electionCount();
        const currentElectionId = Number(electionCount) - 1;

        // Add candidates
        tx = await VotingDao.connect(owner).addCandidate(currentElectionId, "Tinubu");
        receipt = await tx.wait();
        logEvent(VotingDao, receipt, "CandidateAdded");

        tx = await VotingDao.connect(owner).addCandidate(currentElectionId, "Atiku");
        receipt = await tx.wait();
        logEvent(VotingDao, receipt, "CandidateAdded");

        tx = await VotingDao.connect(owner).addCandidate(currentElectionId, "Peter Obi");
        receipt = await tx.wait();
        logEvent(VotingDao, receipt, "CandidateAdded");

        // Vote (ensure Peter Obi wins)
        tx = await VotingDao.connect(owner).vote(currentElectionId, 2); // Owner votes for Peter Obi
        receipt = await tx.wait();
        logEvent(VotingDao, receipt, "VoteCast");

        tx = await VotingDao.connect(voter1).vote(currentElectionId, 2); // voter1 votes for Peter Obi
        receipt = await tx.wait();
        logEvent(VotingDao, receipt, "VoteCast");

        // End the election
        tx = await VotingDao.connect(owner).endElection(currentElectionId);
        receipt = await tx.wait();
        logEvent(VotingDao, receipt, "ElectionEnded");
        logEvent(VotingDao, receipt, "WinnerUpdated");

        // Get the winner
        const winner = await VotingDao.connect(owner).getWinner(currentElectionId);
        console.log("Winner:", winner);
    } catch (error) {
        console.error("Error:", error);
    }
}

function logEvent(contract: any, receipt: any, eventName: string) {
    if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
            const parsedLog = contract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === eventName) {
                console.log("Event:", parsedLog.name, "Args:", parsedLog.args);
            }
        }
    }
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});