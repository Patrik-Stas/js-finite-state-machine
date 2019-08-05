const { semaphoreDefinition } = require('./semaphore')
const { createStrategyMemory, createFsmManager } = require('../src')

async function runExample () {
  let strategyMemory = createStrategyMemory()
  const fsmManager = createFsmManager(strategyMemory, semaphoreDefinition)
  const semaphore = await fsmManager.machineCreate('id-1')
  console.log(`Semaphore1 is in state ${await semaphore.getState()}.`)

  // function doTransition(transitionName) invokes transitions. If the transition
  // is valid according to provided FSM definition, machine changes its state.
  await semaphore.doTransition('enable')
  console.log(`Semaphore1 is in state ${await semaphore.getState()}.`)
}
runExample()
