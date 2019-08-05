const { createStrategyRedis } = require('../src')
const { semaphoreDefinition } = require('./semaphore')
const { createFsmManager } = require('../src')
const redis = require('redis')

async function runExample () {
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
  const redisClient = redis.createClient(REDIS_URL)

  // and we can use it exactly like we did previously
  const strategy = createStrategyRedis(redisClient, `fsm-demo-${Date.now()}`)
  const fsmManager = createFsmManager(strategy, semaphoreDefinition)
  let semaphore = await fsmManager.fsmCreate('id1')
  await semaphore.doTransition('enable')
  console.log(`Semaphore is in state ${await semaphore.getState()}.`)
}
runExample()
