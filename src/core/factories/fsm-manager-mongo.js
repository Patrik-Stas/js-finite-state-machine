const { createStateMachine } = require('../fsm')

module.exports.createFsmManagerMdb = function createFsmManagerMdb (definition, mdbCollection) {
  async function loadMachine (machineKey) {
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
    loadMachine,
    destroyMachine,
    getAllMachinesData
  }
}
