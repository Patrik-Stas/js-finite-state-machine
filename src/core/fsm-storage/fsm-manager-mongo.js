const { createStateMachine } = require('../fsm')

module.exports.createFsmManagerMdb = function createFsmManagerMdb (definition, mdbCollection) {
  async function _generateMachineInstance (machineKey) {
    const saveFsm = async function saveFsm (machineData) {
      machineData['_id'] = machineKey
      await mdbCollection.updateOne(
        { '_id': machineKey },
        { $set: { machineData } },
        { upsert: true, returnOriginal: false }
      )
    }

    const loadFsm = async function loadFsm () {
      const serialized = await mdbCollection.findOne(
        { '_id': machineKey }
      )
      return serialized ? serialized.machineData : null
    }

    return createStateMachine(saveFsm, loadFsm, definition)
  }

  /*
  Returns true if machine exists
  Returns false if machine does not exist
   */
  async function machineExists (machineKey) {
    return mdbCollection.findOne({ '_id': machineKey })
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
    loadMachine,
    destroyMachine,
    getAllMachinesData
  }
}
