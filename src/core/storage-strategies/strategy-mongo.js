module.exports.createStrategyMongo = function createStrategyMongo (mdbCollection) {
  async function machineSave (machineId, machineData) {
    await mdbCollection.updateOne(
      { 'machineId': machineId },
      { $set: { machineData } },
      { upsert: true, returnOriginal: false }
    )
  }

  async function machineLoad (machineId) {
    const serialized = await mdbCollection.findOne(
      { machineId }
    )
    return serialized ? serialized.machineData : null
  }

  async function machineExists (machineId) {
    return mdbCollection.findOne({ machineId })
  }

  async function machinesLoad (skip = null, limit = null) {
    let result = mdbCollection.find({}, { '_id': 0 })
    if (skip !== null) {
      result = result.skip(skip)
    }
    if (limit !== null) {
      result = result.limit(limit)
    }
    const machinesDataSerialized = await result.sort({ 'machineData.utimeCreated': -1 }).toArray()
    const machines = machinesDataSerialized.map(serialized => {
      const { machineData } = serialized
      return machineData
    })
    return machines
  }

  async function machineDestroy (machineId) {
    await mdbCollection.deleteOne({ machineId })
  }

  return {
    machineSave,
    machineLoad,
    machineExists,
    machinesLoad,
    machineDestroy
  }
}
