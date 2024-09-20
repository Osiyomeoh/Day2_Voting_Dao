// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting_Dao{
    struct Candidate {
        string name;
        uint voteCount;
        uint256 candidateId;
    }

    struct Voter {
        bool voted;
        uint256 vote; 
    }

    struct Election {
        string title;
        uint votingEnd;
        bool isActive;
        uint256 candidateCount;
        string winnerName;
        uint winningVoteCount;
        mapping(uint256 => Candidate) candidates;
        mapping(address => Voter) voters;
    }

    address public owner;
    uint public electionCount;
    mapping(uint => Election) public elections; 

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier electionExists(uint electionId) {
        require(electionId < electionCount, "Election does not exist");
        _;
    }

    modifier onlyDuringVoting(uint electionId) {
        require(block.timestamp <= elections[electionId].votingEnd, "Voting period has ended");
        _;
    }

    // modifier onlyAfterVoting(uint electionId) {
    //     require(block.timestamp > elections[electionId].votingEnd, "Voting period is still active");
    //     _;
    // }

    constructor() {
        owner = msg.sender;
        electionCount = 0;
    }

    // Events
    event ElectionCreated(uint indexed electionId, string title, uint votingEnd);
    event CandidateAdded(uint indexed electionId, uint256 indexed candidateId, string name);
    event VoteCast(uint indexed electionId, address indexed voter, uint256 candidateId);
    event ElectionEnded(uint indexed electionId, string winnerName, uint winningVoteCount);
    event WinnerUpdated(uint indexed electionId, string winnerName, uint winningVoteCount);

    // Function to create a new election
    function createElection(string memory _title, uint _votingDuration) external onlyOwner {
        Election storage newElection = elections[electionCount];
        newElection.title = _title;
        newElection.votingEnd = block.timestamp + _votingDuration;
        newElection.isActive = true;

        electionCount++;
        emit ElectionCreated(electionCount - 1, _title, newElection.votingEnd);
    }

    // Function to add a candidate to an election
    function addCandidate(uint electionId, string memory _candidateName) external onlyOwner electionExists(electionId) {
        Election storage election = elections[electionId];
        
        uint256 newCandidateId = election.candidateCount;
        require(election.candidates[newCandidateId].voteCount == 0, "Candidate already exists");
        
        election.candidates[newCandidateId] = Candidate({
            name: _candidateName,
            voteCount: 0,
            candidateId: newCandidateId
        });
        
        election.candidateCount++;
        emit CandidateAdded(electionId, newCandidateId, _candidateName);
    }

    // Voters can vote in a specific election
    function vote(uint electionId, uint256 candidateId) external electionExists(electionId) onlyDuringVoting(electionId) {
        Election storage election = elections[electionId];
        Voter storage sender = election.voters[msg.sender];
        require(election.isActive, "Election is not active");
        require(!sender.voted, "Already voted");
        require(candidateId < election.candidateCount, "Invalid candidate");

        sender.voted = true;
        sender.vote = candidateId;
        election.candidates[candidateId].voteCount++;
        emit VoteCast(electionId, msg.sender, candidateId);
    }

    // Function to get the winner of a specific election
    function getWinner(uint electionId) external view electionExists(electionId)  returns (string memory winnerName, uint winningVoteCount) {
        Election storage election = elections[electionId];
        require(!election.isActive, "Election is still active");
        return (election.winnerName, election.winningVoteCount);
    }

    // New function to update the winner
    function updateWinner(uint electionId, uint256 candidateId) external onlyOwner electionExists(electionId)  {
        Election storage election = elections[electionId];
        require(!election.isActive, "Election is still active");
        require(candidateId < election.candidateCount, "Invalid candidate");

        Candidate storage candidate = election.candidates[candidateId];
        if (candidate.voteCount > election.winningVoteCount) {
            election.winnerName = candidate.name;
            election.winningVoteCount = candidate.voteCount;
            emit WinnerUpdated(electionId, election.winnerName, election.winningVoteCount);
        }
    }

    // Function to get details of a candidate in a specific election
    function getCandidate(uint electionId, uint256 candidateId) external view electionExists(electionId) returns (string memory name, uint voteCount) {
        Election storage election = elections[electionId];
        require(candidateId < election.candidateCount, "Invalid candidate");
        Candidate storage candidate = election.candidates[candidateId];
        return (candidate.name, candidate.voteCount);
    }

    // Function to check if an address has voted in a specific election
    function hasVoted(uint electionId, address voter) external view electionExists(electionId) returns (bool) {
        Election storage election = elections[electionId];
        return election.voters[voter].voted;
    }

    // Function to get election details
    function getElection(uint electionId) external view electionExists(electionId) returns (string memory title, uint votingEnd, bool isActive, uint candidateCount) {
        Election storage election = elections[electionId];
        return (election.title, election.votingEnd, election.isActive, election.candidateCount);
    }

    // New function to end an election
    function endElection(uint electionId) external onlyOwner electionExists(electionId) {
        Election storage election = elections[electionId];
        require(election.isActive, "Election is already inactive");
        
        election.isActive = false;
        
        // Find the winner
        uint256 winningVoteCount = 0;
        string memory winnerName;
        
        for (uint256 i = 0; i < election.candidateCount; i++) {
            if (election.candidates[i].voteCount > winningVoteCount) {
                winningVoteCount = election.candidates[i].voteCount;
                winnerName = election.candidates[i].name;
            }
        }
        
        election.winnerName = winnerName;
        election.winningVoteCount = winningVoteCount;
        emit ElectionEnded(electionId, election.winnerName, election.winningVoteCount);
    }
}
