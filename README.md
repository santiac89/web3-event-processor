  
# ethereum-event-processor

## Description

This module is intended to listen for events that takes place in Ethereum blockchain and act accordingly.

Basically, it polls events from the provided contracts every X milliseconds and executes the corresponding callback for that event passing the event information to it.

## Usage

  ```
  const EthereumEventProcessor = require('ethereum-event-processor');
  const Web3 = require('web3');
  const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));

  const options = { pollingInterval: 500, startBlock: 200, blocksToWait: 20, blocksToRead: 20 };
    
  const eventProcessor = new EthereumEventProcessor(web3, contract.address, contract.abi, options);

  eventProcessor.on('EventName', (event) => {
    console.log(fromBlock, lastBlock); 
  });

  eventProcessor.on('blocks_processed', (fromBlock, lastBlock) => {
    console.log(fromBlock, lastBlock); 
  });

  eventProcessor.listen();
  eventProcessor.stop();
  ```

## **EthereumEventProcessor**

### `constructor(web3, contract_address, contract_abi options)`

Arguments:

### ***web3*** 

A Web3 connection object to the blokchain.

### ***contract_address***

The address of the contract to listen for events.

### ***contract_abi***

The ABI in JSON format of the contract to listen for events.

### ***options***

A JavaScript object containing the configuration for the event processor behaviour.

***startBlock***  Block number to start listening from.

***pollingInterval*** Interval in milliseconds between every poll to the blockchain.

***blocksToWait*** Number of blocks to wait before start reading events from new blocks. This will make the interval to be skipped if `(latestBlockNumber - lastReadBlock + blocksToRead) < blocksToWait`.

***blocksToRead*** Number of blocks to read in each interval.

### `listen(options)`

Starts or resumes the events processor consuming process. It can receive the same arguments as the constructor options to override default behaviour.

### `stop`

Stop the current event processor consuming process.

### `on('end', function(fromBlock, toBlock))`

Receives a function to be executed every time a new set of blocks is processed. The function receives the start and end numbers of the blocks that have been processed in that iteration.

### `on(eventName, function(event))`

Receives a function to be executed every time the event specified as a string with `eventName` has been received. The function receives the event object as an argument.
