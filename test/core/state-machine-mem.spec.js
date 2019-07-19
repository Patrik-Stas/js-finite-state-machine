/* eslint-env jest */
const { createInMemMachineGenerator } = require('../../src/core/factories/fsm-factory-mem')
const { matterMachineDefinition } = require('./../common')

let stateMachine
let machineId
let generateTestcaseMachine

beforeEach(async () => {
  const utime = Math.floor(new Date() / 1000)
  machineId = `machine-${utime}`
  generateTestcaseMachine = createInMemMachineGenerator(matterMachineDefinition)
  stateMachine = await generateTestcaseMachine(machineId)
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
    const state = await stateMachine.getState()
    const history = await stateMachine.getHistory()
    // assert
    expect(state).toBe('solid')
    expect(history).toBeDefined()
    expect(history.length).toBe(0)
  })

  it('state machines from factory should have separate states', async () => {
    // act
    const stateMachine1 = await generateTestcaseMachine(`${machineId}-1`)
    const stateMachine2 = await generateTestcaseMachine(`${machineId}-2`)

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

  it('should create machine if initial state if previous was destroyed', async () => {
    await stateMachine.transitionStart('melt')
    await stateMachine.transitionFinish()
    await stateMachine.destroy()
    // assert
    const stateMachineRecreated = await generateTestcaseMachine(machineId)
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
    const stateMachineReloaded = await generateTestcaseMachine(machineId)

    // assert
    const originalStringified = JSON.stringify(await stateMachine.getMachineData())
    const reloadedStringified = JSON.stringify(await stateMachineReloaded.getMachineData())
    expect(reloadedStringified).toBe(originalStringified)
  })

  it('reloaded machine should have the same data as original after transitioning', async () => {
    // act
    await stateMachine.transitionStart('melt')
    await stateMachine.transitionFinish()
    const stateMachineReloaded = await generateTestcaseMachine(machineId)

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
    const stateMachineReloaded = await generateTestcaseMachine(machineId)
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

    const stateMachineReloaded = await generateTestcaseMachine(machineId)
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
    stateMachine = await generateTestcaseMachine(machineId)
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
