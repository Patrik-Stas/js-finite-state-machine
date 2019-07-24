/* eslint-env jest */
const { matterMachineDefinition } = require('./../common')
const uuid = require('uuid')

let stateMachine
// let testSuiteRunId
let testCaseRunId

// function saveMachine (id, data) {
//
// }
//
// function loadMachine (id) {
//
// }
//
// function generateId (id) {
//
// }

beforeEach(async () => {
  testCaseRunId = `machine-${uuid.v4()}`
  createStateMachine()
})

describe('state machine with memory storage', () => {
  it('should start in initialState', async () => {
    // act
    const currentState = await stateMachine.getState()
    const isSolidByDefault = await stateMachine.isInState('solid')
    const machineData = await stateMachine.getMachineData()
    // assert
    expect(currentState).toBe('solid')
  })
})
