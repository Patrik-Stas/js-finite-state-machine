const { createStateMachine } = require('../fsm')

module.exports.createInMemMachineGenerator = function createInMemMachineGenerator (definition) {
  let storage = {}

  async function build (machineKey) {
    const saveFsm = (machineData) => {
      storage[machineKey] = machineData
    }
    const loadFsm = () => storage[machineKey]

    const deleteFsm = async () => {
      storage[machineKey] = undefined
    }

    return createStateMachine(saveFsm, loadFsm, deleteFsm, definition)
  }

  return build
}
