const { createStateMachine } = require('../fsm')
const { loadStateMachine } = require('../fsm')
const { spawnStateMachine } = require('../fsm')

module.exports.createFsmManagerMdb = function createFsmManagerMdb (fsmDefinition, mdbCollection) {
  function generateStorageMethods (machineId) {
    const getFsmId = () => {
      return machineId
    }

    const saveFsm = async function saveFsm (machineData) {
      await mdbCollection.updateOne(
        { '_id': machineId },
        { $set: { machineData } },
        { upsert: true, returnOriginal: false }
      )
    }

    const loadFsm = async function loadFsm () {
      const serialized = await mdbCollection.findOne(
        { '_id': machineId }
      )
      return serialized ? serialized.machineData : null
    }

    return {
      saveFsm,
      loadFsm,
      getFsmId
    }
  }

  async function machineExists (machineId) {
    return mdbCollection.findOne({ '_id': machineId })
  }

  async function loadMachine (machineId) {
    const exists = await machineExists(machineId)
    if (!exists) {
      throw Error(`Machine ${JSON.stringify(machineId)} does not exist.`)
    }
    const { saveFsm, loadFsm, getFsmId } = generateStorageMethods(machineId)
    return loadStateMachine(saveFsm, loadFsm, getFsmId, fsmDefinition)
  }

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
    let machinesDataSerialized = await mdbCollection.find({}).toArray()
    const machines = machinesDataSerialized.map(serialized => {
      const { machineData } = serialized
      return { machineData, id: serialized['_id'] }
    })
    return machines
  }

  async function destroyMachine (machineKey) {
    await mdbCollection.deleteOne({ '_id': machineKey })
  }

  return {
    machineExists,
    createMachine,
    spawnMachine,
    loadMachine,
    destroyMachine,
    getAllMachinesData
  }
}
