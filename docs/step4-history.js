const { semaphoreDefinition } = require('./semaphore')
const { createStrategyMemory, createFsmManager } = require('../src')

async function runExample () {
  let strategyMemory = createStrategyMemory()
  const fsmManager = createFsmManager(strategyMemory, semaphoreDefinition)
  const semaphore = await fsmManager.machineCreate('id-1')
  console.log(await semaphore.getState())
  await semaphore.doTransition('enable')
  await semaphore.doTransition('next')
  const semaphoreReloaded = await fsmManager.machineLoad('id-1')
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
