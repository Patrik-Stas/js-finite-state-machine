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
  fsmId may be string or object with fields up to 1 level. Examples of valid fsmId:
  "abc123"
  { userId: "abcd-123-54324", process: "xyz-2354-122355" }
   */
  function generateStorageMethods (fsmId) {
    async function saveFsmData (fsmData) {
      /*
      The storage strategy must implement fsmDataSave such that any valid fsmId (see above) can be decoded back
      into original fsmId value
       */
      await storageStrategy.fsmDataSave(fsmId, fsmData)
    }

    async function loadFsmFull () {
      /*
      Storage strategy is expected to return { fsmData, fsmId }
      Whereas:
      - fsmData is object, the content is specified by fsm.js implementation. Contains states, history, transitions, ...
      - fsmId is the same as fsmId parameter
       */
      return storageStrategy.fsmFullLoad(fsmId)
    }

    return {
      saveFsmData,
      loadFsmFull
    }
  }

  async function fsmFullLoad (fsmId, options) {
    const exists = await storageStrategy.machineExists(fsmId)
    if (!exists) {
      if (options && options.createOnNotFound) {
        return fsmCreate(fsmId)
      } else {
        throw Error(`Machine ${JSON.stringify(fsmId)} does not exist.`)
      }
    }
    const { saveFsmData, loadFsmFull } = generateStorageMethods(fsmId)
    return loadStateMachine(saveFsmData, loadFsmFull, fsmDefinitionWrapper)
  }

  /*
  Creates closure representing the machine.
  Throws if machine already exists
   */
  async function fsmCreate (fsmId) {
    const exists = await storageStrategy.machineExists(fsmId)
    if (exists) {
      throw Error(`Machine ${JSON.stringify(fsmId)} already exist.`)
    }
    const { saveFsmData, loadFsmFull } = generateStorageMethods(fsmId)
    return createStateMachine(saveFsmData, loadFsmFull, fsmDefinitionWrapper)
  }

  /*
  Spawns representative object for machine of an id. Only use this if you are sure the given instance actually
  already exists in storage.
   */
  async function fsmSpawn (fsmId) {
    const exists = await storageStrategy.machineExists(fsmId)
    if (exists) {
      throw Error(`Machine ${JSON.stringify(fsmId)} already exist.`)
    }
    const { saveFsmData, loadFsmFull, getFsmId } = generateStorageMethods(fsmId)
    return spawnStateMachine(saveFsmData, loadFsmFull, getFsmId, fsmDefinitionWrapper)
  }

  async function fsmDestroy (fsmId) {
    await storageStrategy.fsmDestroy(fsmId)
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
