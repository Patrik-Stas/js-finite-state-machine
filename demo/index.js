const path = require('path')
const { createFsmManager } = require('../src/core/fsm-manager')
const sleep = require('sleep-promise')
const { semaphoreDefinition } = require('./semaphore-fsm')
const fs = require('fs')
const { createMongoStorage } = require('./demo-common')

async function start () {
  const strategy = await createMongoStorage()
  const fsmManager = createFsmManager(strategy, semaphoreDefinition)
  const dotGraph = fsmManager.getFsmDefinitionWrapper().dotify()
  console.log(`This is dot representation of the state machine:\n${dotGraph}`)
  const dotPath = path.resolve(__dirname, 'semaphore.dot')
  fs.writeFileSync(dotPath, dotGraph)
  console.log('Render and see this graph by running:\nnpm run demo:dotfile:render-and-view')

  // ----- ----- ----- ----- -----
  // ----- Creating First FSM ------
  // ----- ----- ----- ----- -----
  // storage managed by fsmManager will be searched for machine with ID 'semaphore1'
  // if it doesn't exist, new machine 'semaphore1' is create in storage and returned.
  const sema1 = await fsmManager.fsmCreate('semaphore1')
  let sema1state = await sema1.getState()
  // any new machine starts in state 'initialState' from FSM Definition
  console.log(`Semaphore1 is in state ${sema1state}.`)

  // ----- ----- ----- ----- -----
  // ----- 1 step transitions ------
  // ----- ----- ----- ----- -----
  // function doTransition(transitionName) invokes transitions. If the transition is valid according to
  // provided FSM definition, machine changes its state.
  await sema1.doTransition('enable')
  sema1state = await sema1.getState()
  console.log(`Semaphore1 is in state ${sema1state}.`)

  // ----- ----- ----- ----- -----
  // ----- 2 steps transitions ------
  // ----- ----- ----- ----- -----
  // There's also option to do transition in 2 steps. This might come handy if you can't
  // perform related state changes atomically.
  await sema1.transitionStart('next')
  await sleep(100) // do some IO operations
  // sema1.getState() this would throw, machine state is not clear as its currently transitioning
  // sema1.doTransition('next') this would throw, because machine is already transitioning
  await sema1.transitionFinish()
  sema1state = await sema1.getState()
  console.log(`Semaphore1 is in state ${sema1state}.`)

  await sema1.transitionStart('next')
  // However, you can inspect all data of a machine as it's stored using following
  const fsmData = await sema1.getFsmData()
  console.log(`Full machine data as it's stored in storage: ${JSON.stringify(fsmData, null, 2)}`)
  //   Full machine data as it's stored in storage:
  //   {
  //     "state": "orange",
  //     "transition": "next",
  //     "history": [
  //        {
  //          "state": "off",
  //          "transition": "enable"
  //        },
  //        {
  //          "state": "red",
  //          "transition": "next"
  //        }
  //   ]
  // }
  await sema1.transitionFinish()

  // if you now reload machine 'semaphore' again, you'll in fact load the same machine.
  const sema1Reloaded = await fsmManager.fsmLoad('semaphore1')
  const history = await sema1Reloaded.getHistory()
  console.log(`Current history of Semaphore1 is: ${JSON.stringify(history, null, 2)}`)
  // Current history of Semaphore1 is: [
  //   {
  //     "state": "off",
  //     "transition": "enable"
  //   },
  //   {
  //     "state": "red",
  //     "transition": "next"
  //   },
  //   {
  //     "state": "orange",
  //     "transition": "next"
  //   }
  // ]

  // History contains only transition which has been finalized. If you call getHistory while machine is
  // transitioning, the transition taking place won't be listed in history because it has not yet been finalized.
}

start()
