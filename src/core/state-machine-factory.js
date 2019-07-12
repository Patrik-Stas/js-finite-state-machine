const { createStateMachine } = require('./state-machine')

module.exports.createStateMachineFactory = function createStateMachineFactory (storage, definition) {
  async function build (machineKey) {
    return createStateMachine(storage, machineKey, definition)
  }

  return {
    build
  }
}
