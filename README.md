
eventProcessor(contractsConfigurations, options);

contracts

const contract = require('.TestContract.json');
const TestContract = new web3.eth.Contract(contract.abi, process.env.CONTRACT_ADDRESS);
  
{
  contract: TestContract,
  events: { 
    TestEvent: async (event) => { 
      
    }
  }
}

options 

{
  startBlock: number,
  pollingInterval: ms
}