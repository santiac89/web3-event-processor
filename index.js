const log = require('./logger')('ethereum-event-processor');

module.exports = function ContractEventListener(
  web3,
  address,
  abi,
  options = {}
) {
  if (!web3) {
    throw new Error('No web3 instance provided.');
  }

  if (!address) {
    throw new Error('No contract address provided.');
  }

  if (!abi) {
    throw new Error('No contract abi provided.');
  }

  let callbacks = { end: () => {} };
  let running = false;
  let timeoutId = null;
  let fromBlock = options.startBlock || 0;
  let pollingInterval = options.pollingInterval || 10000;

  const compiledContract = new web3.eth.Contract(abi, address);

  this.listen = ({ _fromBlock = fromBlock, _pollingInterval = pollingInterval }) => {
    running = true;

    fromBlock = _fromBlock;
    pollingInterval = _pollingInterval;

    log.info('Starting from block %s', fromBlock);
 
    consumeEvents();
  };

  this.stop = () => {
    running = false;
    log.info('Stopped');
  };

  this.on = (eventName, callback) => {
    if (eventName === 'end' || compiledContract.events[eventName]) {
      callbacks[eventName] = callback;
    } else {
      throw new Error(`The "${eventName}" event does not exist in the configured contract.`);
    }
  }

  const poll = async (fn, time) => {
    if (running) {
      await fn();
      timeoutId = setTimeout(() => poll(fn, time), time);
    } else {
      clearTimeout(timeoutId);
    }
  };

  const consumeEvents = () => {
    poll(async () => {
      try {
        let lastBlock = await web3.eth.getBlockNumber();
        let blockExists = await web3.eth.getBlock(lastBlock);
        
        if (!blockExists) {
          log.debug('Can\'t confirm block %s yet. Skipping...', lastBlock);
          return;
        }
  
        if (fromBlock === lastBlock) {
          log.debug('No new block since block number %s', lastBlock);
          return;
        }
  
        fromBlock++;
  
        log.debug('Polling block %s to block %s', fromBlock, lastBlock);
        
        const events = await getEvents(compiledContract, fromBlock, lastBlock);
        
        events.forEach(async (eventLog) => {
          const eventName = eventLog.event;

          log.info('%s event received: %O', eventName, eventLog);
          
          try {
            if (callbacks[eventName]) {
              await callbacks[eventName](eventLog);
            }
          } catch (processingError) {
            log.error(`%s:%s produced an error when processing the event:\nError:\n %O\nEvent:\n %O`, contractName, eventName, processingError, eventLog);
          }
        });
        
        callbacks.end(fromBlock, lastBlock);
        fromBlock = lastBlock;
      } catch (eventsError) {
        log.error('Error received! %O', eventsError);
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