const { spawnStateMachine } = require('../fsm')

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

  function hasKey (key) {
    return (!!storage[key])
  }

  return {
    set,
    get,
    del,
    hasKey,
    getKeys
  }
}

/*
The simplest in-memory reference implementation of basic state machine management interface. This interface enables
identification of machines by a single ID value. The advantage of preserving this interface in your implementation of
FSM Manager is that you can levrage tests in this project which assume this interface.
 */
/*
The fsm storage strategy must define:
- what machineId is - string? object? array?
- how to retrieve one machine from storage
- how to save one machine in storage
- how to load machines from storage (+ filters)
 */
module.exports.createFsmManagerMem = function createFsmManagerMem (fsmDefinition, memStorage) {
  async function _generateMachineInstance (machineKey) {
    const saveFsm = (machineId, machineData) => {
      memStorage.set(machineKey, machineData)
    }
    const loadFsm = (machineId) => {
      return memStorage.get(machineKey)
    }

    const getMachineId = () => {
      return `idmachine:${machineKey}`
    }

    return spawnStateMachine(saveFsm, loadFsm, getMachineId, fsmDefinition)
  }

  /*
  Returns true if machine exists
  Returns false if machine does not exist
   */
  async function machineExists (machineKey) {
    return memStorage.hasKey(machineKey)
  }

  async function spawnMachine (machine) {
    const idEncoded = machine.getEncodedId()
    const machineId = idEncoded.split(':')[1]
    return _generateMachineInstance(machineId)
  }

  /*
  Creates closure representing the machine.
  Throws if machine does not already exists.
   */
  async function loadMachine (machineKey) {
    const exists = await machineExists(machineKey)
    if (!exists) {
      throw Error(`Machine ${machineKey} does not exist.`)
    }
    return _generateMachineInstance(machineKey)
  }

  /*
  Creates closure representing the machine.
  Throws if machine already exists
   */
  async function createMachine (machineKey) {
    const exists = await machineExists(machineKey)
    if (exists) {
      throw Error(`Machine ${machineKey} already exist.`)
    }
    return _generateMachineInstance(machineKey)
  }

  async function spawnFromData (fullMachineData) {
    const { id } = fullMachineData.metadata
    const instance = _generateMachineInstance(id)
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
    machineExists,
    createMachine,
    loadMachine,
    getAllMachinesData,
    destroyMachine
  }
}
