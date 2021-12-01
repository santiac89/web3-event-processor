const EthereumEventProcessor = require('./index');

function fakeContract() { 
  this.getPastEvents = (type, range, callback) => {
    return callback(undefined, [{ event: 'FakeEvent' }]);
  }
  
  this.events = {
    FakeEvent: () => {}
  }
};

const web3mock = {
  eth: { 
    getBlock: jest.fn(),
    getBlockNumber: jest.fn(),
    Contract: fakeContract
  }
};

const sleep = (ms) => new Promise((resolve, reject) => {
  setTimeout(() => resolve(), ms);
});

describe('ContractEventListener', function() {
  describe('constructor' , () => {
    describe('when no parameters are passed', () => {
      it('should throw an error', function() {
        expect(() =>  new EthereumEventProcessor()).toThrow('No web3 instance provided.');
      });
    });

    describe('when no address is passed', () => {
      it('should throw an error', function() {
        expect(() =>  new EthereumEventProcessor(web3mock)).toThrow('No contract address provided.');
      });
    });

    describe('when contract abi is not passed', () => {
      it('should throw an error', function() {
        expect(() =>  new EthereumEventProcessor(web3mock, "0x0")).toThrow('No contract abi provided.');
      });
    });

    describe('when all parameters are passed', () => {
      it('should return a ContractEventListener instance', function() {
        const eventListener = new EthereumEventProcessor(web3mock, "0x0", { foo: 'bar' });
        expect(eventListener).not.toBeNull();
      });
    });
  });

  describe('#on()', () => {
    web3mock.eth.getBlockNumber.mockReturnValue(5);
    web3mock.eth.getBlock.mockReturnValue(2);
    
    describe('when listening for the "end" event', () => {
      const eventCallback = jest.fn();

      it('should assign a callback to call when new events has finished processing', async () => {
        const eventListener = new EthereumEventProcessor(web3mock, '0x0', { foo: 'bar' }, { blocksToWait: 0, blocksToRead: 1 });
        eventListener.on('end', eventCallback);
        eventListener.listen({ pollingInterval: 1 });
        await sleep(1);
        eventListener.stop();
        expect(eventCallback).toHaveBeenCalledWith(1, 2);
      });
    });

    describe('when listening for a contract event', () => {
      const eventCallback = jest.fn();

      it('should assign a callback to call when the contract event has been received', async () => {
        const eventListener = new EthereumEventProcessor(web3mock, '0x0', { foo: 'bar' }, { blocksToWait: 0, blocksToRead: 1 });
        eventListener.on('FakeEvent', eventCallback);
        eventListener.listen({ pollingInterval: 1 });
        await sleep(1);
        eventListener.stop();
        expect(eventCallback).toHaveBeenCalledWith({ event: 'FakeEvent' });
      });
    });

    describe('when listening for a non-existent contract event', () => {
      it('should assign a callback to call when new events has finished processing', function() {
        const eventListener = new EthereumEventProcessor(web3mock, '0x0', { foo: 'bar' });
        expect(() => eventListener.on('NonExistingEvent', () => {})).toThrow(Error);  
      });
    });
  });
});
