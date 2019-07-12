/* eslint-env jest */
const { createInMemStateStorage } = require('../../src/state-stores/mem')
const { createStateMachineFactory } = require('../../src/core/state-machine-factory')
const { matterMachineDefinition } = require('./../common')

let memStorage
let machineFactory

beforeEach(async () => {
  memStorage = createInMemStateStorage()
  machineFactory = createStateMachineFactory(memStorage, matterMachineDefinition)
})

describe('machine factory test', () => {
  it('should create machine with proper initial state', async () => {
    // act
    const stateMachine = await machineFactory.build('machine1')

    const currentState = await stateMachine.getState()
    const isSolidByDefault = await stateMachine.isInState('solid')
    // assert
    expect(currentState).toBe('solid')
    expect(isSolidByDefault).toBeTruthy()
  })

  it('state machines from factory should have separate states', async () => {
    // act
    const stateMachine1 = await machineFactory.build('machine1')
    const stateMachine2 = await machineFactory.build('machine2')

    await stateMachine1.goToState('liquid')
    await stateMachine2.goToState('liquid')
    await stateMachine2.goToState('gas')
    const currentState1 = await stateMachine1.getState()
    const currentState2 = await stateMachine2.getState()
    // assert
    expect(currentState1).toBe('liquid')
    expect(currentState2).toBe('gas')
  })

  it('should create machine if intial state if previous was destroyed', async () => {
    // act
    const stateMachine1 = await machineFactory.build('machine1')

    await stateMachine1.goToState('liquid')
    await stateMachine1.destroy()
    // assert
    const stateMachine1Recreated = await machineFactory.build('machine1')
    expect(await stateMachine1Recreated.getState()).toBe('solid')
  })
})
