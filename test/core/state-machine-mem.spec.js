/* eslint-env jest */
const { createInMemStateStorage } = require('../../src/state-stores/mem')
const { createStateMachine } = require('../../src/core/state-machine')
const { matterMachineDefinition } = require('./../common')

let storage
let stateMachine
let machineId

beforeEach(async () => {
  storage = createInMemStateStorage()
  const utime = Math.floor(new Date() / 1000)
  machineId = `machine-${utime}`
  stateMachine = await createStateMachine(storage, machineId, matterMachineDefinition)
})

describe('state machine with memory storage', () => {
  it('should start in initialState', async () => {
    // act
    const currentState = await stateMachine.getState()
    const isSolidByDefault = await stateMachine.isInState('solid')
    // assert
    expect(currentState).toBe('solid')
    expect(isSolidByDefault).toBeTruthy()
  })

  it('should create store record in storage', async () => {
    // act
    const state = await storage.get(machineId)
    // assert
    expect(state).toBe('solid')
  })

  it('should recognize states "solid" as tangible based on metadata', async () => {
    // act
    const metadata = await stateMachine.getMetadata()
    // assert
    expect(metadata.tangible).toBe(true)
  })

  it('should recognize states "luquid" as tangible based on metadata', async () => {
    // act
    await stateMachine.goToState('liquid')
    const metadata = await stateMachine.getMetadata()
    // assert
    expect(metadata.tangible).toBe(true)
  })

  it('should start from initial state if machine was deleted and recreated', async () => {
    // arrange
    await stateMachine.goToState('liquid')
    await stateMachine.destroy()
    stateMachine = await createStateMachine(storage, machineId, matterMachineDefinition)
    // act
    const currentState = await stateMachine.getState()
    const isSolidByDefault = await stateMachine.isInState('solid')
    // assert
    expect(currentState).toBe('solid')
    expect(isSolidByDefault).toBeTruthy()
  })

  it('should recognize states "gas" as non-tangible based on metadata', async () => {
    // act
    await stateMachine.goToState('liquid')
    await stateMachine.goToState('gas')
    const metadata = await stateMachine.getMetadata()
    // assert
    expect(metadata.tangible).toBe(false)
  })

  it('should transition from solid to liquid', async () => {
    // act
    await stateMachine.goToState('liquid')
    const isLiquid = await stateMachine.isInState('liquid')
    const state = await stateMachine.getState(machineId)

    // assert
    expect(isLiquid).toBeTruthy()
    expect(state).toBe('liquid')
  })

  it('should throw if transition is invalid', async () => {
    let thrownError
    // act
    try {
      await stateMachine.goToState('gas')
    } catch (err) {
      thrownError = err
    }
    // assert
    expect(thrownError.toString().includes(`Transition from current state 'solid' to state 'gas' is invalid.`)).toBeTruthy()
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
