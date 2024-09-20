import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";



const VoteModule = buildModule("VoteModule", (m) => {


  const vote = m.contract("Voting_Dao", []);

  return { vote };
});

export default VoteModule;



//VoteModule#Voting_Dao - 0xA43013fC03187673Fa6e70ddb1DAe5C5c8BD2bEa