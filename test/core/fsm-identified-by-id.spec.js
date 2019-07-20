/* eslint-env jest */
const { createMemKeystore } = require('../../src/core/fsm-storage/fsm-manager-mem')
const { createFsmManagerMem } = require('../../src/core/fsm-storage/fsm-manager-mem')
const { createFsmManagerMdb } = require('../../src/core/fsm-storage/fsm-manager-mongo')
const { createFsmManagerRedis } = require('../../src/core/fsm-storage/fsm-manager-redis')
const { matterMachineDefinition } = require('./../common')
const MongoClient = require('mongodb')
const redis = require('redis')
const uuid = require('uuid')
const util = require('util')

let stateMachine
let machineId
let fsmManager
let createFsmManager
let suiteRunId

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'mem'

beforeEach(async () => {
  suiteRunId = `${uuid.v4()}`
  if (STORAGE_TYPE === 'mem') {
    // we are careful here to make sure that any fsmManagerMem created will share the same in-mem storage
    let keystores = {}
    createFsmManager = (machineDefinition, fsmNamespace) => {
      if (!keystores[fsmNamespace]) {
        keystores[fsmNamespace] = createMemKeystore()
      }
      return createFsmManagerMem(machineDefinition, keystores[fsmNamespace])
    }
  } else if (STORAGE_TYPE === 'mongodb') {
    const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
    const asyncMongoConnect = util.promisify(MongoClient.connect)
    const mongoHost = await asyncMongoConnect(MONGO_URL)
    const mongoDatabase = await mongoHost.db(`UNIT-TEST-STATEMACHINE`)
    createFsmManager = async (machineDefinition, fsmNamespace) => {
      const collection = await mongoDatabase.collection(fsmNamespace)
      return createFsmManagerMdb(machineDefinition, collection)
    }
  } else if (STORAGE_TYPE === 'redis') {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
    const redisClient = redis.createClient(REDIS_URL)
    createFsmManager = (machineDefinition, fsmNamespace) => {
      return createFsmManagerRedis(machineDefinition, redisClient, fsmNamespace)
    }
  } else {
    throw Error(`Unknown storage type '${STORAGE_TYPE}'.`)
  }
  fsmManager = await createFsmManager(matterMachineDefinition, suiteRunId)

  machineId = `machine-${uuid.v4()}`
  stateMachine = await fsmManager.loadMachine(machineId)
})

describe('state machine with memory storage', () => {
  it('should start in initialState', async () => {
    // act
    const currentState = await stateMachine.getState()
    const isSolidByDefault = await stateMachine.isInState('solid')
    const machineData = await stateMachine.getMachineData()
    // assert
    expect(currentState).toBe('solid')
    expect(isSolidByDefault).toBeTruthy()
    expect(machineData.state).toBe('solid')
    expect(machineData.transition).toBe(null)
    expect(machineData.name).toBe(matterMachineDefinition.name)
    expect(machineData.version).toBe(matterMachineDefinition.version)
    expect(JSON.stringify(machineData.history)).toBe('[]')
  })

  it('should create store record in storage with default values', async () => {
    // act
    const state = await stateMachine.getState()
    const history = await stateMachine.getHistory()
    // assert
    expect(state).toBe('solid')
    expect(history).toBeDefined()
    expect(history.length).toBe(0)
  })

  it('state machines from factory should have separate states', async () => {
    // act
    const stateMachine1 = await fsmManager.loadMachine(`${machineId}-1`)
    const stateMachine2 = await fsmManager.loadMachine(`${machineId}-2`)

    await stateMachine1.transitionStart('melt')
    await stateMachine1.transitionFinish()
    await stateMachine2.transitionStart('melt')
    await stateMachine2.transitionFinish()
    await stateMachine2.transitionStart('vaporize')
    await stateMachine2.transitionFinish()
    const currentState1 = await stateMachine1.getState()
    const currentState2 = await stateMachine2.getState()
    // assert
    expect(currentState1).toBe('liquid')
    expect(currentState2).toBe('gas')
  })

  it('should return all managed state machines', async () => {
    // act
    const stateMachine2 = await fsmManager.loadMachine(`${machineId}-2`)
    await stateMachine2.transitionStart('melt')
    const machines = await fsmManager.getAllMachinesData()
    // assert
    expect(machines).toBeDefined()
    expect(machines.length).toBe(2)
    const loadedMachine = machines.find(m => m.id === `${machineId}`)
    const loadedMachine2 = machines.find(m => m.id === `${machineId}-2`)
    expect(loadedMachine).toBeDefined()
    expect(loadedMachine2).toBeDefined()
    expect(loadedMachine.machineData).toBeDefined()
    expect(loadedMachine2.machineData).toBeDefined()
    expect(loadedMachine.machineData.state).toBe('solid')
    expect(loadedMachine.machineData.transition).toBe(null)
    expect(loadedMachine2.machineData.state).toBe('solid')
    expect(loadedMachine2.machineData.transition).toBe('melt')
  })

  it('should create machine if initial state if previous was destroyed', async () => {
    await stateMachine.transitionStart('melt')
    await stateMachine.transitionFinish()
    await fsmManager.destroyMachine(machineId)
    // assert
    const stateMachineRecreated = await fsmManager.loadMachine(machineId)
    expect(await stateMachineRecreated.getState()).toBe('solid')
  })

  it('should recognize states "solid" as tangible based on metadata', async () => {
    // act
    const state = await stateMachine.getState()
    const stateDefinition = stateMachine.getDefinitionWrapper().findStateDefinitionByName(state)
    // assert
    expect(stateDefinition.name).toBe('solid')
    expect(stateDefinition.metadata.tangible).toBe(true)
  })

  it('should transition from solid to liquid using start-finish transition', async () => {
    // act
    await stateMachine.transitionStart('melt')
    await stateMachine.transitionFinish()
    // assert
    expect(await stateMachine.getState()).toBe('liquid')
    expect(await stateMachine.isInState('liquid')).toBeTruthy()
  })

  it('should transition from solid to liquid', async () => {
    // act
    await stateMachine.doTransition('melt')
    // assert
    expect(await stateMachine.getState()).toBe('liquid')
    expect(await stateMachine.isInState('liquid')).toBeTruthy()
  })

  it('reloaded machine should have the same data as original', async () => {
    // act
    const stateMachineReloaded = await fsmManager.loadMachine(machineId)

    // assert
    const originalStringified = JSON.stringify(await stateMachine.getMachineData())
    const reloadedStringified = JSON.stringify(await stateMachineReloaded.getMachineData())
    expect(reloadedStringified).toBe(originalStringified)
  })

  it('should throw error if machine is reloaded using fsm definition with different name', async () => {
    let editedMachineDefinition = { ...matterMachineDefinition, type: `matter-type-edit-${uuid.v4()}` }
    // act
    const modifiedFsmManager = await createFsmManager(editedMachineDefinition, suiteRunId)
    let thrownError
    try {
      await modifiedFsmManager.loadMachine(machineId)
    } catch (err) {
      thrownError = err
    }
    // assert
    expect(thrownError.toString()).toBe(`Error: Loaded machine type '${matterMachineDefinition.type}' but was expecting to find '${editedMachineDefinition.type}'.`)
  })

  it('reloaded machine should have the same data as original after transitioning', async () => {
    // act
    await stateMachine.transitionStart('melt')
    await stateMachine.transitionFinish()
    const stateMachineReloaded = await fsmManager.loadMachine(machineId)

    // assert
    const originalStringified = JSON.stringify(await stateMachine.getMachineData())
    const reloadedStringified = JSON.stringify(await stateMachineReloaded.getMachineData())
    expect(reloadedStringified).toBe(originalStringified)
  })

  it('should throw if trying to make 2 transitions at once', async () => {
    let thrownError
    // act
    await stateMachine.transitionStart('melt')
    await stateMachine.transitionFinish()
    await stateMachine.transitionStart('freeze')
    try {
      await stateMachine.transitionStart('vaporize')
    } catch (err) {
      thrownError = err
    }
    // assert
    expect(thrownError.toString()).toBe(`Error: Loaded machine and it's found to be transitioning state which was not expected.`)
  })

  it('should throw if state is requested while transitioning', async () => {
    let thrownError
    // act
    await stateMachine.transitionStart('melt')
    try {
      await stateMachine.getState()
    } catch (err) {
      thrownError = err
    }
    // assert
    expect(thrownError.toString()).toBe(`Error: Loaded machine and it's found to be transitioning state which was not expected.`)
  })

  it('should recognize that loaded machine is transitioning', async () => {
    let thrownError
    // act
    await stateMachine.transitionStart('melt')
    await stateMachine.transitionFinish()
    await stateMachine.transitionStart('freeze')
    const stateMachineReloaded = await fsmManager.loadMachine(machineId)
    try {
      await stateMachineReloaded.transitionStart('vaporize')
    } catch (err) {
      thrownError = err
    }
    // assert
    expect(thrownError.toString()).toBe(`Error: Loaded machine and it's found to be transitioning state which was not expected.`)
  })

  it('should load existing machine', async () => {
    // act
    await stateMachine.transitionStart('melt')
    await stateMachine.transitionFinish()
    await stateMachine.transitionStart('vaporize')
    await stateMachine.transitionFinish()
    // assert

    const stateMachineReloaded = await fsmManager.loadMachine(machineId)
    expect(await stateMachineReloaded.getState()).toBe('gas')
    expect(await stateMachineReloaded.isInState('gas')).toBeTruthy()
    const history = await stateMachineReloaded.getHistory(true)
    expect(history.length).toBe(2)
    expect(history[0].state).toBe('solid')
    expect(history[0].transition).toBe('melt')
    expect(history[1].state).toBe('liquid')
    expect(history[1].transition).toBe('vaporize')
  })

  it('should return history of finalized start-finish transitions', async () => {
    // act
    await stateMachine.transitionStart('melt')
    await stateMachine.transitionFinish()

    // assert
    const history = await stateMachine.getHistory()
    expect(history.length).toBe(1)
    expect(history[0].state).toBe('solid')
    expect(history[0].transition).toBe('melt')
  })

  it('should return history of finalized transitions', async () => {
    // act
    await stateMachine.doTransition('melt')

    // assert
    const history = await stateMachine.getHistory()
    expect(history.length).toBe(1)
    expect(history[0].state).toBe('solid')
    expect(history[0].transition).toBe('melt')
  })

  // should return finalized transition if we are currently transitioning
  it('should return history of finalized transitions if we are in the middle of transition', async () => {
    // act
    await stateMachine.transitionStart('melt')

    // assert
    const history = await stateMachine.getHistory(false)
    expect(history.length).toBe(0)
  })

  it('should start from initial state if machine was deleted and recreated', async () => {
    // arrange
    await stateMachine.transitionStart('melt')
    await stateMachine.transitionFinish()
    expect(await stateMachine.getState()).toBe('liquid')
    expect(await stateMachine.isInState('liquid')).toBeTruthy()
    // act
    await fsmManager.destroyMachine(machineId)
    stateMachine = await fsmManager.loadMachine(machineId)
    // assert
    expect(await stateMachine.getState()).toBe('solid')
    expect(await stateMachine.isInState('solid')).toBeTruthy()
  })

  it('should throw if transition is invalid', async () => {
    let thrownError
    // act
    try {
      await stateMachine.transitionStart('condense')
    } catch (err) {
      thrownError = err
    }
    // assert
    expect(thrownError.toString().includes(`Transition 'condense' from current state 'solid' is invalid.`)).toBeTruthy()
  })

  it('should throw if transition with given name does not exist.', async () => {
    let thrownError
    // act
    try {
      await stateMachine.transitionStart('fooo')
    } catch (err) {
      thrownError = err
    }
    // assert
    expect(thrownError.toString().includes(`Unknown transition 'fooo'.`)).toBeTruthy()
  })

  it('should throw if trying to transfer to unknown state', async () => {
    // act
    try {
      await stateMachine.goToState('plasma')
      expect(true).toBeFalsy()
    } catch (e) { }
  })

  it('should throw if transition breaks transition rules', async () => {
    // act
    try {
      await stateMachine.goToState('gas')
      expect(true).toBeFalsy()
    } catch (e) { }
  })

  it('should not throw if machine is in one of the allowed states', async () => {
    // act
    await stateMachine.assertInSomeState('plasma', 'solid')
    expect(true).toBeTruthy()
  })

  it('should throw if machine is not in one of the allowed states', async () => {
    try {
      await stateMachine.assertInSomeState('gas', 'liquid')
      expect(true).toBeFalsy()
    } catch (e) { }
  })
})
