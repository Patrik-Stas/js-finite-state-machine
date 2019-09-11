module.exports.createStrategyMongo = function createStrategyMongo (mdbCollection) {

  mdbCollection.createIndex({ 'fsmData.utimeCreated': -1 })
  mdbCollection.createIndex({ 'fsmData.utimeUpdated': -1 })
  mdbCollection.createIndex({ 'fsmData.state': 1 })

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

  async function fsmFullLoadMany (skip = null, limit = null, filter = null, sort = null) {
    filter = filter || {}
    let result = mdbCollection.find(filter, { '_id': 0 })
    if (skip) {
      result = result.skip(skip)
    }
    if (limit) {
      result = result.limit(limit)
    }
    sort = sort || { 'fsmData.utimeCreated': -1 }
    return result.sort(sort).toArray()
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
