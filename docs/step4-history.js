const { createMongoStorage } = require('../demo/demo-common')
const { semaphoreDefinition } = require('./semaphore')
const { createFsmManager } = require('../src')

async function runExample () {
  const strategy = await createMongoStorage()
  const fsmManager = createFsmManager(strategy, semaphoreDefinition)
  const semaphore = await fsmManager.fsmCreate('id-1')
  console.log(await semaphore.getState())
  await semaphore.doTransition('enable')
  await semaphore.doTransition('next')
  const semaphoreReloaded = await fsmManager.fsmLoad('id-1')
  const history = await semaphoreReloaded.getHistory()
  console.log(`Current history of Semaphore id-1 is: ${JSON.stringify(history, null, 2)}`)
  // Current history of Semaphore1 is: [
  //   {
  //     "state": "off",
  //     "transition": "enable"
  //   },
  //   {
  //     "state": "red",
  //     "transition": "next"
  //   }
}
runExample()
