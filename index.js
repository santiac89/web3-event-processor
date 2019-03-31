const log = require('./logger')('ethereum-event-processor');

const getEvents = (contract, fromBlock, toBlock) => new Promise((resolve, reject) => {
  contract.getPastEvents(
    'allEvents',
    { fromBlock, toBlock },
    (err, eventLogs) => {
        if (err) {
          return reject(err);
        }

        resolve(eventLogs);
    });
});

module.exports = function EthereumEventProcessor(web3, contracts = [], options = {}) {
  this.contracts = {};

  contracts.forEach((contract) => {
    this.contracts[contract.contractName] = contract;
  });

  this.options = options;
  this.eventConfigs = {};
  this.running = false;
  this.fromBlock = this.options.startBlock || 0;
  this.pollingInterval = this.options.pollingInterval || 10000;
  this.eventsProcessedCallback = () => {};

  this.onEventsProcessed = (fn) => {
    this.eventsProcessedCallback = fn;
  };

  this.start = (fromBlock = this.fromBlock, pollingInterval = this.pollingInterval) => {
    this.running = true;

    this.fromBlock = fromBlock;
    this.pollingInterval = pollingInterval;

    log.info('Starting from block %s', fromBlock);

    this.consumeEvents();
  };

  this.stop = () => {
    log.info('Stopping...');
    this.running = false;
  };

  this.addContract = (contract) => {
    if (this.contracts[contract.contractName]) {
      log.error('Contract %s is already registered', contract.contractName);
      return;
    }

    this.contracts[contract.contractName] = contract;
    this.eventConfigs[contract.contractName] = {};
  }

  this.removeContract = (contract) => {
    if (!this.contracts[contract.contractName]) {
      log.error('Cannot remove contract since is not registered %s', contract.contractName);
      return;
    }

    delete this.contracts[contract.contractName];
    delete this.eventConfigs[contract.contractName];
  };

  this.subscribe = (contractName, eventName, callback) => {
    if (!this.contracts[contractName] || !this.eventConfigs[contractName]) {
      log.error('Cannot subscribe to event %s since the specified contract is not registered %s', eventName, contractName);
      return;
    }

    this.eventConfigs[contractName][eventName] = callback;
  };

  this.unsubscribe = (contractName, eventName) => {
    if (!this.contracts[contractName] || !this.eventConfigs[contractName]) {
      log.error('Cannot unsubscribe from event %s since the specified contract is not registered %s', eventName, contractName);
      return;
    }

    if (!this.eventConfigs[contractName][eventName]) {
      log.warn('Cannot unsubscribe event %s since it is not registered for the specified contract %s', eventName, contractName);
      return;
    }

    delete this.eventConfigs[contractName][eventName];
  };

  this.poll = async (fn, time) => {
    if (this.running) {
      await fn();
      setTimeout(() => this.poll(fn, time), time);
    }    
  };

  this.consumeEvents = () => {
    this.poll(async () => {
      try {
        let lastBlock = await web3.eth.getBlockNumber();
        let blockExists = await web3.eth.getBlock(lastBlock);
        
        if (!blockExists) {
          log.debug('Can\'t confirm block %s yet! Skipping...', lastBlock);
          return;
        }
  
        if (this.fromBlock === lastBlock) {
          log.debug('No new block since block number %s', lastBlock);
          return;
        }
  
        this.fromBlock++;
  
        log.debug('Polling block %s to block %s', this.fromBlock, lastBlock);
        
        Object.values(this.contracts).forEach(async (contract) => {
          const events = await getEvents(contract, this.fromBlock, lastBlock);
  
          events.forEach(async (eventLog) => {
            const contractName = contract.contractName;
            const eventName = eventLog.event;
  
            log.info('%s:%s event received: %O', contractName, eventName, eventLog);
  
            try {
              if (this.eventConfigs[contractName] && this.eventConfigs[contractName][eventName]) {
                await this.eventConfigs[contractName][eventName](eventLog);
              }
            } catch (processingError) {
              log.error(`%s:%s produced an error when processing the event:\nError:\n %O\nEvent:\n %O`, contractName, eventName, processingError, eventLog);
            }
          });
        });
        
        this.eventsProcessedCallback(this.fromBlock, lastBlock);
        this.fromBlock = lastBlock;
      } catch (eventsError) {
        log.error('Error received! %O', eventsError);
        process.exit(1);
      }
    }, this.pollingInterval);
  };
};