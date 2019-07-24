const { spawnStateMachine } = require('../fsm')

/*
The simplest in-memory reference implementation of basic state machine management interface. This interface enables
identification of machines by a single ID value. The advantage of preserving this interface in your implementation of
FSM Manager is that you can levrage tests in this project which assume this interface.
 */
module.exports.createFsmManagerMem = function createFsmManagerMem (fsmDefinition, fsmStorageStrategy, memStorage) {
  async function _generateMachineInstance () {
    spawnStateMachine(
      fsmStorageStrategy.saveFsm,
      fsmStorageStrategy.loadFsm,
      fsmStorageStrategy.getMachineId,
      fsmDefinition
    )
  }
  /*
  Returns true if machine exists
  Returns false if machine does not exist
   */
  async function machineExists (machineId) {
    return fsmStorageStrategy.machineExists(machineId)
  }

  async function spawnMachine (machineId) {
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
