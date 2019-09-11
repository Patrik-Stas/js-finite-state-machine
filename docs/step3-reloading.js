const {createMongoStorage} = require('../demo/demo-common')
const { semaphoreDefinition } = require('./semaphore')
const { createFsmManager } = require('../src')

async function runExample () {
  const strategy = await createMongoStorage()
  const fsmManager = createFsmManager(strategy, semaphoreDefinition)
  let semaphore = await fsmManager.fsmCreate('id-1')
  console.log(`Semaphore1 is in state ${await semaphore.getState()}.`)

  await semaphore.doTransition('enable')
  sema1state = await semaphore.getState()
  console.log(`Semaphore1 is in state ${sema1state}.`)
  // let's forget about our semaphore instance for now
  delete semaphore

  // just to find it later again!
  const semaphoreReloaded = await fsmManager.fsmLoad('id-1')
  sema1state = await semaphoreReloaded.getState()
  console.log(`Reloaded Semaphore1 is in state ${sema1state}.`)
}
runExample()
