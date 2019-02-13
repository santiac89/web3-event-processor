  
## Usage

    const eventProcessor = require('ethereum-event-processor');
    const Web3 = require('web3');
	const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));
	
	const compiledContract = new web3.eth.Contract(<contract_abi>, <contract_address>);
	
    const contractsConfigurations = [
	    { 
		    contract: compiledContract,
		    events: {
			    EventName: async (event) => {}
		    }
	    }
	];
    
    const options = { pollingInterval: 500, startBlock: 200 };
    
    eventProcessor(contractsConfigurations, options);
