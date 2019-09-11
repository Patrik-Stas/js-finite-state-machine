const {createMongoStorage} = require('../demo/demo-common')
const { semaphoreDefinition } = require('./semaphore')
const { createFsmManager } = require('../src')

async function runExample () {
  const strategy = await createMongoStorage()
  const fsmManager = createFsmManager(strategy, semaphoreDefinition)
  let semaphore = await fsmManager.fsmCreate('id1')
  await semaphore.doTransition('enable')
  console.log(`Semaphore is in state ${await semaphore.getState()}.`)
}
runExample()
