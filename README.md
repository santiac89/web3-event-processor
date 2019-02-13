  
# ethereum-event-processor

## Description

This module is intended to listen for events that takes place in Ethereum blockchain and act accordingly.

Basically, it polls events from the provided contracts every X milliseconds and executes the corresponding callback for that event passing the event information to it.

## Usage

  ```
  const eventProcessor = require('ethereum-event-processor');
  const Web3 = require('web3');
  const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));

  const compiledContract = new web3.eth.Contract(<contract_abi>, <contract_address>);

  const contractsConfigurations = [{
    contract: compiledContract,
    events: {
      EventName: async (event) => {}
    }
  }];
    
  const options = { pollingInterval: 500, startBlock: 200 };
    
  eventProcessor(contractsConfigurations, options);
  ```

  ### Arguments

  #### `contractsConfigurations` 
  
  An array of JS objects that contains the web3js contract and the events callbacks that are going to be processed on that contract.

  ##### Example

  ```
  [
    {
      contract: web3Contract,
      events: {
        EventName: async (event) => {
          console.log(event);
          // Do some stuff...
        },
        AnotherEventNameFromSameContract: async (event) => {
          console.log(event);
          // Do some stuff...
        }
      }
    },
    {
      contract: anotherWeb3Contract,
      events: {
        AnotherEventName: async (event) => {
          console.log(event);
          // Do some stuff...
        }
      }
    }
  ]
  ```

  #### `options`
  
  `pollingInterval` `Integer` The interval in ms to wait between each events poll.

  `startBlock` `Integer` The block number where to start consuming events from.