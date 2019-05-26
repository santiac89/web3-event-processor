  
# ethereum-event-processor

## Description

This module is intended to listen for events that takes place in Ethereum blockchain and act accordingly.

Basically, it polls events from the provided contracts every X milliseconds and executes the corresponding callback for that event passing the event information to it.

## Usage

  ```
  const EthereumEventProcessor = require('ethereum-event-processor');
  const Web3 = require('web3');
  const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));

  const compiledContract = new web3.eth.Contract(<contract_abi>, <contract_address>);
    
  const options = { pollingInterval: 500, startBlock: 200 };
    
  const eventProcessor = new EthereumEventProcessor(web3, options);

  eventProcessor.onEvents((fromBlock, lastBlock) => {
    console.log(fromBlock, lastBlock); 
  });

  eventProcessor.addContract('SomeContractName', compiledContract);
  eventProcessor.subscribe('SomeContractName', 'EventName', (event) => {});

  eventProcessor.start();
  ```

## **EthereumEventProcessor**

### `constructor(web3, options)`

Arguments:

### ***web3*** 

A Web3 connection object to the blokchain.

### ***options***

A JavaScript object that configurates the event processor behaviour. There are only two options configurable so far:

***startBlock***  Block number to start listening from.

***pollingInterval*** Interval in milliseconds between every poll to the blockchain.

### `start(startBlock, pollingInterval)`

Starts the events processor consuming process. It can receive the same arguments as the constructor options to override default behaviour.

### `stop`

Stop the current event processor consuming process.

### `onEvents(function(fromBlock, lastBlock))`

Receives a function to be executed every time a new set of blocks is processed. The function receives the start and end numbers of the blocks that have been processed in that iteration.

### `subscribe(contractName, eventName, function(event))`

Subscribes a listener function to be executed when a particular event from a particular contract has been triggered on the blockchain. The function receives the raw event as described in Web3JS documentation.

If the contract name provided does not correspond to a previously registered contract in the event processor an error log is printed.

Arguments:

**contractName** The name of the contract 

**eventName** The name of the event to subscribe.

### `unsubscribe(contractName, eventName)`

Unsubscribes a previously registered listener. If no contract is registered for that name or no event is registered for that contract then an error log is printed.

Arguments:

**contractName** The name of the contract 

**eventName** The name of the event to unsubscribe.

### `addContract(contractName, contract)`

Registers a contract to be listened to.

Arguments:

**contractName** The name of the contract 

**contract** A compiled Web3js contract

### `removeContract(contractName)` 

Unregisters a contract from the event processor and also removes all listeners for that contract. If the contract is not previously registred it will print an error log.

Arguments:

**contractName** The name of the contract 