module.exports.createStrategyMongo = function createStrategyMongo (mdbCollection) {
  async function fsmDataSave (fsmId, fsmData) {
    await mdbCollection.updateOne(
      { fsmId },
      { $set: { fsmData } },
      { upsert: true, returnOriginal: false }
    )
  }

  async function fsmFullLoad (fsmId) {
    const serialized = await mdbCollection.findOne(
      { fsmId }
    )
    return serialized || null
  }

  async function fsmExists (fsmId) {
    return !!(await mdbCollection.findOne({ fsmId }))
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

  async function fsmDestroy (fsmId) {
    await mdbCollection.deleteOne({ fsmId })
  }

  return {
    fsmDataSave,
    fsmFullLoad,
    fsmExists,
    fsmFullLoadMany,
    fsmDestroy
  }
}
