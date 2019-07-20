const { createStateMachine } = require('../fsm')

module.exports.createMemKeystore = function createMemKeystore () {
  let storage = {}

  function set (key, value) {
    storage[key] = value
  }

  function get (key) {
    return storage[key]
  }

  function del (key) {
    delete storage[key]
  }

  function getKeys () {
    return storage
  }

  return {
    set,
    get,
    del,
    getKeys
  }
}

/*
The simplest in-memory reference implementation of basic state machine management interface. This interface enables
identification of machines by a single ID value. The advantage of preserving this interface in your implementation of
FSM Manager is that you can levrage tests in this project which assume this interface.
 */
module.exports.createFsmManagerMem = function createFsmManagerMem (fsmDefinition, memStorage) {
  async function loadMachine (machineKey) {
    const saveFsm = (machineData) => {
      memStorage.set(machineKey, machineData)
    }
    const loadFsm = () => {
      return memStorage.get(machineKey)
    }

    return createStateMachine(saveFsm, loadFsm, fsmDefinition)
  }

  /*
   Return all machines in provided storage where <fsmInStorage>.type === fsmDefinition.type
   */
  async function getAllMachinesData () {
    const machineIds = memStorage.getKeys()
    const machines = []
    for (const id in machineIds) {
      machines.push({ machineData: memStorage.get(id), id })
    }
    return machines
  }
  async function destroyMachine (machineKey) {
    memStorage.del(machineKey)
  }

  return {
    loadMachine,
    getAllMachinesData,
    destroyMachine
  }
}
