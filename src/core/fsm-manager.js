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

  /*
  The strategy implementations are expected to be implemented in a way such that
  machineId may be string or object with fields up to 1 level. Examples of valid machineId:
  "abc123"
  { userId: "abcd-123-54324", process: "xyz-2354-122355" }
   */
  function generateStorageMethods (machineId) {
    async function saveFsmData (fsmData) {
      /*
      The storage strategy must implement fsmDataSave such that any valid machineId (see above) can be decoded back
      into original machineId value
       */
      await storageStrategy.fsmDataSave(machineId, fsmData)
    }

    async function loadFsmFull () {
      /*
      Storage strategy is expected to return { fsmData, machineId }
      Whereas:
      - fsmData is object, the content is specified by fsm.js implementation. Contains states, history, transitions, ...
      - machineId is the same as machineId parameter
       */
      return storageStrategy.fsmFullLoad(machineId)
    }

    return {
      saveFsmData,
      loadFsmFull
    }
  }

  async function fsmFullLoad (machineId, options) {
    const exists = await storageStrategy.machineExists(machineId)
    if (!exists) {
      if (options && options.createOnNotFound) {
        return fsmCreate(machineId)
      } else {
        throw Error(`Machine ${JSON.stringify(machineId)} does not exist.`)
      }
    }
    const { saveFsmData, loadFsmFull } = generateStorageMethods(machineId)
    return loadStateMachine(saveFsmData, loadFsmFull, fsmDefinitionWrapper)
  }

  /*
  Creates closure representing the machine.
  Throws if machine already exists
   */
  async function fsmCreate (machineId) {
    const exists = await storageStrategy.machineExists(machineId)
    if (exists) {
      throw Error(`Machine ${JSON.stringify(machineId)} already exist.`)
    }
    const { saveFsmData, loadFsmFull } = generateStorageMethods(machineId)
    return createStateMachine(saveFsmData, loadFsmFull, fsmDefinitionWrapper)
  }

  /*
  Spawns representative object for machine of an id. Only use this if you are sure the given instance actually
  already exists in storage.
   */
  async function fsmSpawn (machineId) {
    const exists = await storageStrategy.machineExists(machineId)
    if (exists) {
      throw Error(`Machine ${JSON.stringify(machineId)} already exist.`)
    }
    const { saveFsmData, loadFsmFull, getFsmId } = generateStorageMethods(machineId)
    return spawnStateMachine(saveFsmData, loadFsmFull, getFsmId, fsmDefinitionWrapper)
  }

  async function fsmDestroy (machineId) {
    await storageStrategy.fsmDestroy(machineId)
  }

  async function fsmFullLoadMany (skip = null, limit = null, filter = null, sort = null) {
    return storageStrategy.fsmFullLoadMany(skip, limit)
  }

  return {
    getFsmDefinitionWrapper,
    fsmFullLoad,
    fsmCreate,
    fsmSpawn,
    fsmDestroy,
    fsmFullLoadMany
  }
}
