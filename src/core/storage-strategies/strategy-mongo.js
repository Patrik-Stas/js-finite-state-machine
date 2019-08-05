module.exports.createStrategyMongo = function createStrategyMongo (mdbCollection) {
  async function fsmDataSave (machineId, fsmData) {
    await mdbCollection.updateOne(
      { machineId },
      { $set: { fsmData } },
      { upsert: true, returnOriginal: false }
    )
  }

  async function fsmFullLoad (machineId) {
    const serialized = await mdbCollection.findOne(
      { machineId }
    )
    return serialized || null
  }

  async function machineExists (machineId) {
    return mdbCollection.findOne({ machineId })
  }

  async function fsmFullLoadMany (skip = null, limit = null) {
    let result = mdbCollection.find({}, { '_id': 0 })
    if (skip !== null) {
      result = result.skip(skip)
    }
    if (limit !== null) {
      result = result.limit(limit)
    }
    return result.sort({ 'fsmData.utimeCreated': -1 }).toArray()
  }

  async function fsmDestroy (machineId) {
    await mdbCollection.deleteOne({ machineId })
  }

  return {
    fsmDataSave,
    fsmFullLoad,
    machineExists,
    fsmFullLoadMany,
    fsmDestroy
  }
}
