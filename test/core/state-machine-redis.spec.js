/* eslint-env jest */
const { createRedisStateStorage } = require('../../src/state-stores/redis')
const { createStateMachine } = require('../../src/core/fsm')
const { matterMachineDefinition } = require('./../common')

const redis = require('redis')
const sleep = require('sleep-promise')

let storage
let stateMachine
let machineId

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

let redisClient

beforeAll(async () => {
  redisClient = redis.createClient(REDIS_URL)
  storage = createRedisStateStorage(redisClient, 'matter-statemachine')
  await sleep(2000)
})

beforeEach(async () => {
  const utime = Math.floor(new Date() / 1)
  machineId = `machine-${utime}`
  stateMachine = await createStateMachine(storage, machineId, matterMachineDefinition)
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
    expect(JSON.stringify(machineData.history)).toBe('[]')
  })

  it('should create store record in storage with default values', async () => {
    // act
    const serializedMachineData = await storage.get(machineId)
    // assert
    expect(serializedMachineData).toBeDefined()
    const machineData = JSON.parse(serializedMachineData)
    expect(machineData.state).toBe('solid')
    expect(machineData.transition).toBeNull()
    expect(machineData.history).toBeDefined()
    expect(machineData.history.length).toBe(0)
  })

  it('should recognize states "solid" as tangible based on metadata', async () => {
    // act
    const state = await stateMachine.getState()
    const stateDefinition = stateMachine.getDefinitionWrapper().findStateDefinitionByName(state)
    // assert
    expect(stateDefinition.name).toBe('solid')
    expect(stateDefinition.metadata.tangible).toBe(true)
  })

  it('should transition from solid to liquid', async () => {
    // act
    await stateMachine.transitionStart('melt')
    await stateMachine.transitionFinish()
    // assert
    expect(await stateMachine.getState()).toBe('liquid')
    expect(await stateMachine.isInState('liquid')).toBeTruthy()
  })

  it('reloaded machine should have the same data as original', async () => {
    // act
    const stateMachineReloaded = await createStateMachine(storage, machineId, matterMachineDefinition)

    // assert
    const originalStringified = JSON.stringify(await stateMachine.getMachineData())
    const reloadedStringified = JSON.stringify(await stateMachineReloaded.getMachineData())
    expect(reloadedStringified).toBe(originalStringified)
  })

  it('reloaded machine should have the same data as original after transitioning', async () => {
    // act
    await stateMachine.transitionStart('melt')
    await stateMachine.transitionFinish()
    const stateMachineReloaded = await createStateMachine(storage, machineId, matterMachineDefinition)

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
    expect(thrownError.toString().includes(`Loaded machine '${machineId}' and its found to be transitioning state which was not expected.`)).toBeTruthy()
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
    expect(thrownError.toString().includes(`Loaded machine '${machineId}' and its found to be transitioning state which was not expected.`)).toBeTruthy()
  })

  it('should recognize that loaded machine is transitioning', async () => {
    let thrownError
    // act
    await stateMachine.transitionStart('melt')
    await stateMachine.transitionFinish()
    await stateMachine.transitionStart('freeze')
    const stateMachineReloaded = await createStateMachine(storage, machineId, matterMachineDefinition)
    try {
      await stateMachineReloaded.transitionStart('vaporize')
    } catch (err) {
      thrownError = err
    }
    // assert
    expect(thrownError.toString().includes(`Loaded machine '${machineId}' and its found to be transitioning state which was not expected.`)).toBeTruthy()
  })

  it('should load existing machine', async () => {
    // act
    await stateMachine.transitionStart('melt')
    await stateMachine.transitionFinish()
    await stateMachine.transitionStart('vaporize')
    await stateMachine.transitionFinish()
    // assert

    const stateMachineReloaded = await createStateMachine(storage, machineId, matterMachineDefinition)
    expect(await stateMachineReloaded.getState()).toBe('gas')
    expect(await stateMachineReloaded.isInState('gas')).toBeTruthy()
    const history = await stateMachineReloaded.getHistory(true)
    expect(history.length).toBe(2)
    expect(history[0].state).toBe('solid')
    expect(history[0].transition).toBe('melt')
    expect(history[1].state).toBe('liquid')
    expect(history[1].transition).toBe('vaporize')
  })

  it('should return history of finalized transitions', async () => {
    // act
    await stateMachine.transitionStart('melt')
    await stateMachine.transitionFinish()

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
    await stateMachine.destroy()
    stateMachine = await createStateMachine(storage, machineId, matterMachineDefinition)
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
