const log = require('./logger')('ethereum-event-processor');



module.exports = function EthereumEventProcessor(web3, options = {}) {
  let contracts = {};
  let eventConfigs = {};
  let running = false;
  let fromBlock = options.startBlock || 0;
  let pollingInterval = options.pollingInterval || 10000;
  let eventsCallback = () => {};

  this.onEvents = (fn) => {
    eventsCallback = fn;
  };

  this.start = (_fromBlock = fromBlock, _pollingInterval = pollingInterval) => {
    running = true;

    fromBlock = _fromBlock;
    pollingInterval = _pollingInterval;

    log.info('Starting from block %s', fromBlock);

    consumeEvents();
  };

  this.stop = () => {
    log.info('Stopping...');
    running = false;
  };

  this.addContract = (contractName, contract) => {
    if (contracts[contractName]) {
      log.error('Contract %s is already registered', contractName);
      return false;
    }

    contracts[contractName] = contract;
    eventConfigs[contractName] = {};
    return true;
  }

  this.removeContract = (contractName) => {
    if (!contracts[contractName]) {
      log.error('Cannot remove contract since is not registered %s', contractName);
      return false;
    }

    delete contracts[contractName];
    delete eventConfigs[contractName];
    return true;
  };

  this.subscribe = (contractName, eventName, callback) => {
    if (!contracts[contractName] || !eventConfigs[contractName]) {
      log.error('Cannot subscribe to event %s since the specified contract is not registered %s', eventName, contractName);
      return false;
    }

    eventConfigs[contractName][eventName] = callback;
    return true;
  };

  this.unsubscribe = (contractName, eventName) => {
    if (!contracts[contractName] || !eventConfigs[contractName]) {
      log.error('Cannot unsubscribe from event %s since the specified contract is not registered %s', eventName, contractName);
      return false;
    }

    if (!eventConfigs[contractName][eventName]) {
      log.warn('Cannot unsubscribe event %s since it is not registered for the specified contract %s', eventName, contractName);
      return false;
    }

    delete eventConfigs[contractName][eventName];
    return true;
  };

  const poll = async (fn, time) => {
    if (running) {
      await fn();
      setTimeout(() => poll(fn, time), time);
    }    
  };

  const consumeEvents = () => {
    poll(async () => {
      try {
        let lastBlock = await web3.eth.getBlockNumber();
        let blockExists = await web3.eth.getBlock(lastBlock);
        
        if (!blockExists) {
          log.debug('Can\'t confirm block %s yet! Skipping...', lastBlock);
          return;
        }
  
        if (fromBlock === lastBlock) {
          log.debug('No new block since block number %s', lastBlock);
          return;
        }
  
        fromBlock++;
  
        log.debug('Polling block %s to block %s', fromBlock, lastBlock);
        
        Object.keys(contracts).forEach(async (contractName) => {
          const events = await getEvents(contracts[contractName], fromBlock, lastBlock);
  
          events.forEach(async (eventLog) => {
            const eventName = eventLog.event;
  
            log.info('%s:%s event received: %O', contractName, eventName, eventLog);
  
            try {
              if (eventConfigs[contractName] && eventConfigs[contractName][eventName]) {
                await eventConfigs[contractName][eventName](eventLog);
              }
            } catch (processingError) {
              log.error(`%s:%s produced an error when processing the event:\nError:\n %O\nEvent:\n %O`, contractName, eventName, processingError, eventLog);
            }
          });
        });
        
        eventsCallback(fromBlock, lastBlock);
        fromBlock = lastBlock;
      } catch (eventsError) {
        log.error('Error received! %O', eventsError);
        process.exit(1);
      }
    }, pollingInterval);
  };

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
};