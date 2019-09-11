const {createMongoStorage} = require('../demo/demo-common')
const { semaphoreDefinition } = require('./semaphore')
const { createFsmManager } = require('../src')

async function runExample () {
  const strategy = await createMongoStorage()
  const fsmManager = createFsmManager(strategy, semaphoreDefinition)
  const semaphore = await fsmManager.fsmCreate('id-1')
  console.log(`Semaphore1 is in state ${await semaphore.getState()}.`)

  // function doTransition(transitionName) invokes transitions. If the transition
  // is valid according to provided FSM definition, machine changes its state.
  await semaphore.doTransition('enable')
  console.log(`Semaphore1 is in state ${await semaphore.getState()}.`)
}
runExample()
