const { spawnStateMachine } = require('../fsm')
const { createStateMachine } = require('../fsm')
const { loadStateMachine } = require('../fsm')

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
The simplest persistence adapter implementation which is using a keyvalue storage (like the memory implementation above)
to persist the machine data. Machines are identified by single ID string.
 */
module.exports.createFsmManagerMem = function createFsmManagerMem (fsmDefinition, keyValueStorage) {
  function generateStorageMethods (machineId) {
    const getFsmId = () => {
      return machineId
    }

    const saveFsm = (machineData) => {
      keyValueStorage.set(machineId, machineData)
    }

    const loadFsm = () => {
      return keyValueStorage.get(machineId)
    }

    return {
      saveFsm,
      loadFsm,
      getFsmId
    }
  }

  async function machineExists (machineId) {
    return !!(await keyValueStorage.get(machineId))
  }

  /*
  Creates closure representing the machine.
  Throws if machine does not already exists.
   */
  async function loadMachine (machineId) {
    const exists = await machineExists(machineId)
    if (!exists) {
      throw Error(`Machine ${JSON.stringify(machineId)} does not exist.`)
    }
    const { saveFsm, loadFsm, getFsmId } = generateStorageMethods(machineId)
    return loadStateMachine(saveFsm, loadFsm, getFsmId, fsmDefinition)
  }

  /*
  Creates closure representing the machine.
  Throws if machine already exists
   */
  async function createMachine (machineId) {
    const exists = await machineExists(machineId)
    if (exists) {
      throw Error(`Machine ${JSON.stringify(machineId)} already exist.`)
    }
    const { saveFsm, loadFsm, getFsmId } = generateStorageMethods(machineId)
    return createStateMachine(saveFsm, loadFsm, getFsmId, fsmDefinition)
  }

  async function spawnMachine (machineId) {
    const exists = await machineExists(machineId)
    if (exists) {
      throw Error(`Machine ${JSON.stringify(machineId)} already exist.`)
    }
    const { saveFsm, loadFsm, getFsmId } = generateStorageMethods(machineId)
    return spawnStateMachine(saveFsm, loadFsm, getFsmId, fsmDefinition)
  }

  async function getAllMachinesData () {
    const machineIds = keyValueStorage.getKeys()
    const machines = []
    for (const id in machineIds) {
      machines.push({ machineData: keyValueStorage.get(id), id })
    }
    return machines
  }

  async function destroyMachine (machineKey) {
    keyValueStorage.del(machineKey)
  }

  return {
    spawnMachine,
    machineExists,
    loadMachine,
    createMachine,
    getAllMachinesData,
    destroyMachine
  }
}
