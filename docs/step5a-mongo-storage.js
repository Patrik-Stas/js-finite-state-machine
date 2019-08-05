const { createStrategyMongo } = require('../src')
const { semaphoreDefinition } = require('./semaphore')
const { createFsmManager } = require('../src')
const util = require('util')
const MongoClient = require('mongodb')

async function runExample () {
  const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
  const asyncMongoConnect = util.promisify(MongoClient.connect)
  const mongoHost = await asyncMongoConnect(MONGO_URL)
  const mongoDatabase = await mongoHost.db(`FSM-DEMO`)
  const collection = await mongoDatabase.collection(`FSM-DEMO-${Date.now()}`)

  // and we can use it exactly like we did previously
  const strategy = createStrategyMongo(collection)
  const fsmManager = createFsmManager(strategy, semaphoreDefinition)
  let semaphore = await fsmManager.fsmCreate('id1')
  await semaphore.doTransition('enable')
  console.log(`Semaphore is in state ${await semaphore.getState()}.`)
}
runExample()
