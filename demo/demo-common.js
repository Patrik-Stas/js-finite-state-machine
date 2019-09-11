const { createStrategyMongo } = require('../src/core/storage-strategies/strategy-mongo')
const util = require('util')
const MongoClient = require('mongodb')

module.exports.createMongoStorage = async function createMongoStorage () {
  const utime = Date.now()
  const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
  const asyncMongoConnect = util.promisify(MongoClient.connect)
  const mongoHost = await asyncMongoConnect(MONGO_URL)
  const mongoDatabase = await mongoHost.db(`UNIT-TEST-STATEMACHINE`)
  const collection = await mongoDatabase.collection(`FSM-DEMO-${utime}`)
  return createStrategyMongo(collection)
}
