const { createFsmManagerMem } = require('../src/core/fsm-storage/fsm-manager-mem')
const { createMemKeystore } = require('../src/core/fsm-storage/fsm-manager-mem')
const sleep = require('sleep-promise')
const util = require('util')
const MongoClient = require('mongodb')
const redis = require('redis')
const { createFsmManagerRedis } = require('../src/core/fsm-storage/fsm-manager-redis')
const { createFsmManagerMdb } = require('../src/core/fsm-storage/fsm-manager-mongo')

const semaphoreDefinition = {
  initialState: 'off',
  states: [
    { name: 'off', metadata: { 'can-pass': false } },
    { name: 'red', metadata: { 'can-pass': false } },
    { name: 'orange', metadata: { 'can-pass': false } },
    { name: 'green', metadata: { 'can-pass': true } }
  ],
  transitions: [
    { name: 'next', from: 'red', to: 'orange' },
    { name: 'next', from: 'orange', to: 'green' },
    { name: 'next', from: 'green', to: 'red' },
    { name: 'disable', from: 'red', to: 'off' },
    { name: 'disable', from: 'orange', to: 'off' },
    { name: 'disable', from: 'green', to: 'off' },
    { name: 'enable', from: 'off', to: 'red' }
  ]
}

async function createFsmManager (storageType) {
  // ----- Creating FSM Manager ------
  switch (storageType) {
    case 'mongodb':
      const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
      const asyncMongoConnect = util.promisify(MongoClient.connect)
      const mongoHost = await asyncMongoConnect(MONGO_URL)
      const mongoDatabase = await mongoHost.db(`UNIT-TEST-STATEMACHINE`)
      const collection = await mongoDatabase.collection('FSM-DEMO')
      return createFsmManagerMdb(semaphoreDefinition, collection)
    case 'redis':
      const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
      const redisClient = redis.createClient(REDIS_URL)
      return createFsmManagerRedis(semaphoreDefinition, redisClient, 'fsm-demo')
    case 'mem':
    default:
      let memStore = createMemKeystore()
      return createFsmManagerMem(semaphoreDefinition, memStore)
  }
}

async function start () {
  const fsmManager = await createFsmManager('mem')

  // ----- ----- ----- ----- -----
  // ----- Creating First FSM ------
  // ----- ----- ----- ----- -----
  // storage managed by fsmManager will be searched for machine with ID 'semaphore1'
  // if it doesn't exist, new machine 'semaphore1' is create in storage and returned.
  const sema1 = await fsmManager.loadMachine('semaphore1')
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
  const machineData = await sema1.getMachineData()
  console.log(`Full machine data as it's stored in storage: ${JSON.stringify(machineData, null, 2)}`)
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
  const sema1Reloaded = await fsmManager.loadMachine('semaphore1')
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
