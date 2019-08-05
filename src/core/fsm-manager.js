const { spawnStateMachine } = require('./fsm')
const { createStateMachine } = require('./fsm')
const { loadStateMachine } = require('./fsm')
const { createFsmDefinitionWrapper } = require('./fsm-definition-wrapper')
/*
Creates closure representing the machine.
Throws if machine does not already exists.
 */
module.exports.createFsmManager = function createFsmManager (storageStrategy, fsmDefinition) {
  const fsmDefinitionWrapper = createFsmDefinitionWrapper(fsmDefinition)

  function getFsmDefinitionWrapper () {
    return fsmDefinitionWrapper
  }

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

  async function machineLoad (machineId, options) {
    const exists = await storageStrategy.machineExists(machineId)
    if (!exists) {
      if (options && options.createOnNotFound) {
        return machineCreate(machineId)
      } else {
        throw Error(`Machine ${JSON.stringify(machineId)} does not exist.`)
      }
    }
    const { saveFsm, loadFsm, getFsmId } = generateStorageMethods(machineId)
    return loadStateMachine(saveFsm, loadFsm, getFsmId, fsmDefinitionWrapper)
  }

  /*
  Creates closure representing the machine.
  Throws if machine already exists
   */
  async function machineCreate (machineId) {
    const exists = await storageStrategy.machineExists(machineId)
    if (exists) {
      throw Error(`Machine ${JSON.stringify(machineId)} already exist.`)
    }
    const { saveFsm, loadFsm, getFsmId } = generateStorageMethods(machineId)
    return createStateMachine(saveFsm, loadFsm, getFsmId, fsmDefinitionWrapper)
  }

  /*
  Spawns representative object for machine of an id. Only use this if you are sure the given instance actually
  already exists in storage.
   */
  async function machineSpawn (machineId) {
    const exists = await storageStrategy.machineExists(machineId)
    if (exists) {
      throw Error(`Machine ${JSON.stringify(machineId)} already exist.`)
    }
    const { saveFsm, loadFsm, getFsmId } = generateStorageMethods(machineId)
    return spawnStateMachine(saveFsm, loadFsm, getFsmId, fsmDefinitionWrapper)
  }

  async function machineDestroy (machineId) {
    await storageStrategy.machineDestroy(machineId)
  }

  async function machinesLoad (skip = null, limit = null, filter = null, sort = null) {
    return storageStrategy.machinesLoad(skip, limit)
  }

  return {
    getFsmDefinitionWrapper,
    machineLoad,
    machineCreate,
    machineSpawn,
    machineDestroy,
    machinesLoad
  }
}
