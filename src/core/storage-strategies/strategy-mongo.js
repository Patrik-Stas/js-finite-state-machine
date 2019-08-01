module.exports.createStrategyMongo = function createStrategyMongo (mdbCollection) {
  async function machineSave (machineId, machineData) {
    await mdbCollection.updateOne(
      { '_id': machineId },
      { $set: { machineData } },
      { upsert: true, returnOriginal: false }
    )
  }

  async function machineLoad (machineId) {
    const serialized = await mdbCollection.findOne(
      { '_id': machineId }
    )
    return serialized ? serialized.machineData : null
  }

  async function machineExists (machineId) {
    return mdbCollection.findOne({ '_id': machineId })
  }

  async function machinesLoadAll () {
    let machinesDataSerialized = await mdbCollection.find({}).toArray()
    const machines = machinesDataSerialized.map(serialized => {
      const { machineData } = serialized
      return { machineData, id: serialized['_id'] }
    })
    return machines
  }

  async function machineDestroy (machineId) {
    await mdbCollection.deleteOne({ '_id': machineId })
  }

  return {
    machineSave,
    machineLoad,
    machineExists,
    machinesLoadAll,
    machineDestroy
  }
}
