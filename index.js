const log = require('./logger')('ethereum-event-processor');
const web3 = require('./web3');

const poll = async (fn, time) => {
  await fn();
  setTimeout(() => poll(fn, time), time);
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

module.exports = (contractsConfigs, options = {}) => {

  if (contractsConfigs.length === 0) {
    throw new Error('No contracts configurations defined.');
  }

  let fromBlock = options.startingBlock || 0;
  const pollingInterval = options.pollingInterval || 10000;

  log.info('Starting from block %s', fromBlock);

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
      
      contractsConfigs.forEach(async (contractConfig) => {
        const events = await getEvents(contractConfig.contract, fromBlock, lastBlock);

        events.forEach(async (eventLog) => {
          const eventName = eventLog.event;
          log.info('%s:%s event received: %O', contractConfig.contract.contractName, eventName, eventLog);

          try {
            if (contractConfig.events[eventName]) {
              await contractConfig.events[eventName](eventLog);
            }
          } catch (processingError) {
            log.error(`%s:%s produced an error when processing the event:\nError:\n %O\nEvent:\n %O`, contractConfig.contract.contractName, eventName, processingError, eventLog);
          }
        });
      });
      
      fromBlock = lastBlock;
    } catch (eventsError) {
      log.error('Error received! %O', eventsError);
      process.exit(1);
    }
  }, pollingInterval);
};