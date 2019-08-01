const { spawnStateMachine } = require('./fsm')
const { createStateMachine } = require('./fsm')
const { loadStateMachine } = require('./fsm')
/*
Creates closure representing the machine.
Throws if machine does not already exists.
 */
module.exports.createFsmManager = function createFsmManager (storageStrategy, fsmDefinition) {
  function generateStorageMethods (machineId) {
    async function saveFsm (machineData) {
      await storageStrategy.machineSave(machineId, machineData)
    }

    async function loadFsm () {
      return storageStrategy.machineLoad(machineId)
    }

    async function getFsmId () {
      return machineId
    }

    return {
      saveFsm,
      loadFsm,
      getFsmId
    }
  }

  async function loadMachine (machineId, options) {
    const exists = await storageStrategy.machineExists(machineId)
    if (!exists) {
      if (options && options.createOnNotFound) {
        return createMachine(machineId)
      } else {
        throw Error(`Machine ${JSON.stringify(machineId)} does not exist.`)
      }
    }
    const { saveFsm, loadFsm, getFsmId } = generateStorageMethods(machineId)
    return loadStateMachine(saveFsm, loadFsm, getFsmId, fsmDefinition)
  }

  /*
  Creates closure representing the machine.
  Throws if machine already exists
   */
  async function createMachine (machineId) {
    const exists = await storageStrategy.machineExists(machineId)
    if (exists) {
      throw Error(`Machine ${JSON.stringify(machineId)} already exist.`)
    }
    const { saveFsm, loadFsm, getFsmId } = generateStorageMethods(machineId)
    return createStateMachine(saveFsm, loadFsm, getFsmId, fsmDefinition)
  }

  /*
  Spawns representative object for machine of an id. Only use this if you are sure the given instance actually
  already exists in storage.
   */
  async function spawnMachine (machineId) {
    const exists = await storageStrategy.machineExists(machineId)
    if (exists) {
      throw Error(`Machine ${JSON.stringify(machineId)} already exist.`)
    }
    const { saveFsm, loadFsm, getFsmId } = generateStorageMethods(machineId)
    return spawnStateMachine(saveFsm, loadFsm, getFsmId, fsmDefinition)
  }

  async function destroyMachine (machineId) {
    await storageStrategy.machineDestroy(machineId)
  }

  async function getAllMachinesData () {
    return storageStrategy.machinesLoadAll()
  }

  return {
    loadMachine,
    createMachine,
    spawnMachine,
    destroyMachine,
    getAllMachinesData
  }
}
