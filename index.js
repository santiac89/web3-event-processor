const log = require('./logger')('ethereum-event-processor');

module.exports = function EthereumEventProcessor(
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
  let fromBlock = options.startBlock != null ? options.startBlock : 1;
  let pollingInterval = options.pollingInterval != null ? options.pollingInterval : 10000;
  let blocksToWait = options.blocksToWait != null ? options.blocksToWait : 20;
  let blocksToRead = options.blocksToRead != null ? options.blocksToRead : 20;

  const compiledContract = new web3.eth.Contract(abi, address);

  this.listen = (override = {}) => {
    running = true;

    fromBlock = override._fromBlock != null ? override._fromBlock : fromBlock;
    pollingInterval = override._pollingInterval != null ? override._pollingInterval : pollingInterval;
    blocksToWait = override._blocksToWait != null ? override._blocksToWait : blocksToWait;
    blocksToRead = override._blocksToRead != null ? override._blocksToRead : blocksToRead;
    toBlock = fromBlock + blocksToRead;

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
        let latestBlock = await web3.eth.getBlockNumber();
        let blocksAhead = latestBlock - toBlock;

        if (blocksAhead <= blocksToWait) {
          log.debug('Not enough confirmed blocks (needs %s, found %s), retrying in %s ...', blocksToWait, blocksAhead, pollingInterval);
          return;
        }

        log.info('Reading events from block %s to block %s', fromBlock, toBlock);
        
        const events = await getEvents(compiledContract, fromBlock, toBlock);
        
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
        
        callbacks.end(fromBlock, toBlock);
        fromBlock = toBlock + 1;
        toBlock = fromBlock + blocksToRead;
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