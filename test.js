const sinon = require('sinon');
const { assert } = require('chai');

const EthereumEventProcessor = require('./index');

const web3mock = {
    eth: sinon.stub({ getBlock: () => {}, getBlockNumber: () => {} })
};

const fakeContract = { 
    getPastEvents: (type, range, callback) => {
        return callback(undefined, [{ event: 'FakeEvent' }]);
    }
};

describe('EthereumEventProcessorArray', function() {
  describe('#onEvents()', function() {
    
    web3mock.eth.getBlockNumber.returns(1);
    web3mock.eth.getBlock.returns(2);
    const eventCallback = sinon.spy();

    it('should assign a callback to call when new events arrive', function() {
      const processor = new EthereumEventProcessor(web3mock);
      processor.onEvents(eventCallback);
      processor.addContract('FakeContract', fakeContract);

      processor.start({ pollingInterval: 0 });
      processor.stop();

      setTimeout(() => assert.isTrue(eventCallback.called), 100);
    });
  });

  describe('#subscribe()', function() {
    const processor = new EthereumEventProcessor(web3mock);

    it('should return false when the contract for the event is not subscribed', function() {
        let result = processor.subscribe("Fake", "Event", () => {});
        assert.isFalse(result);
    });

    it('should return true when the event is subscribed succesfully', function() {
        processor.addContract("FakeContract", {});
        let result = processor.subscribe("FakeContract", "Event", () => {});
        assert.isTrue(result);
    });
  });

  describe('#unsubscribe()', function() {
    const processor = new EthereumEventProcessor(web3mock);

    it('should return false when the contract for the event is not subscribed', function() {
        let result = processor.unsubscribe("Fake", "Event", () => {});
        assert.isFalse(result);
    });

    it('should return false when the event has already been unsubscribed', function() {
        processor.addContract("FakeContract", {});
        processor.unsubscribe("FakeContract", "Event", () => {});
        let result = processor.unsubscribe("FakeContract", "Event", () => {});
        assert.isFalse(result);
    });
  });

  describe('#addContract()', function() {
    it('should return false when the contract has already been added', function() {
        const processor = new EthereumEventProcessor(web3mock);
        processor.addContract("FakeContract", {});
        let result = processor.addContract("FakeContract", {});
        assert.isFalse(result);
    });

    it('should return true when the contract is added successfully', function() {
        const processor = new EthereumEventProcessor(web3mock);
        let result = processor.addContract("FakeContract", {});
        assert.isTrue(result);
    });
  });

  describe('#removeContract()', function() {
    it('should return false when the contract has already been removedor it has never been added', function() {
        const processor = new EthereumEventProcessor(web3mock);
        let result = processor.removeContract("FakeContract");
        assert.isFalse(result);
    });

    it('should return true when the contract is removed successfully', function() {
        const processor = new EthereumEventProcessor(web3mock);
        processor.addContract("FakeContract", {});
        let result = processor.removeContract("FakeContract");
        assert.isTrue(result);
    });
  });
});
