/* eslint-env jest */
const {findStateFullByName} = require('../../src/core/state-definition-util')
const {getStateAfterTransition} = require('../../src/core/state-definition-util')
const {getStateAfterStateChange} = require('../../src/core/state-definition-util')
const { isValidTransition } = require('../../src/core/state-definition-util')
const { isValidStateChange } = require('../../src/core/state-definition-util')
const { assertIsValidMachineDefinition } = require('../../src/core/state-definition-util')
const { matterMachineDefinition } = require('./../common')

const simpleMatterDefinition = {
  initialState: 'solid',
  states: [
    { name: 'solid' },
    { name: 'liquid' },
    { name: 'gas' }
  ],
  transitions: [
    { name: 'melt', from: 'solid', to: 'liquid' },
    { name: 'vaporize', from: 'liquid', to: 'gas' }
  ]
}

describe('state machine definition utils', () => {
  it('should not throw if machine definition is valid', async () => {
    assertIsValidMachineDefinition(matterMachineDefinition)
  })

  it('should throw error if initial state is not defined', async () => {
    const definition = {
      states: [
        { name: 'gas' }
      ],
      transitions: []
    }
    let thrownError
    try {
      assertIsValidMachineDefinition(definition)
    } catch (err) {
      thrownError = err
    }
    expect(thrownError.toString().includes('Initial state is not defined')).toBeTruthy()
  })

  it('should throw error if initial state refers unknown state', async () => {
    const definition = {
      initialState: 'solid',
      states: [
        { name: 'gas' }
      ],
      transitions: []
    }
    let thrownError
    try {
      assertIsValidMachineDefinition(definition)
    } catch (err) {
      thrownError = err
    }
    expect(thrownError.toString().includes(`Initial state value refers state 'solid' which was not declared.`)).toBeTruthy()
  })

  it('should throw error if transition refers unknown state', async () => {
    const definition = {
      initialState: 'solid',
      states: [
        { name: 'solid' },
        { name: 'liquid' }
      ],
      transitions: [
        { name: 'melt', from: 'solid', to: 'liquid' },
        { name: 'vaporize', from: 'liquid', to: 'gas' }
      ]
    }
    let thrownError
    try {
      assertIsValidMachineDefinition(definition)
    } catch (err) {
      thrownError = err
    }
    expect(thrownError.toString().includes(`Transition ${JSON.stringify({ name: 'vaporize', from: 'liquid', to: 'gas' })} refers state to='gas' which was not declared.`)).toBeTruthy()
  })

  it('should find full state by state name', async () => {
    const definition = {
      states: [
        { name: 'gas', metadata: { label: 'foo' } },
        { name: 'solid', metadata: { label: 'bar' } }
      ],
      transitions: []
    }
    const stateFull = findStateFullByName('gas', definition)
    expect(stateFull).toBeDefined()
    expect(stateFull.name).toBe('gas')
    expect(stateFull.metadata).toBeDefined()
    expect(stateFull.metadata.label).toBe('foo')
  })

  it('should return undefined if name is not matching any state from state definition', async () => {
    const definition = {
      states: [
        { name: 'solid', metadata: { label: 'bar' } }
      ],
      transitions: []
    }
    const state = findStateFullByName('gas', definition)
    expect(state).toBeUndefined()
  })

  it('should be valid state changes', async () => {
    expect(isValidStateChange('solid', 'liquid', simpleMatterDefinition)).toBeTruthy()
    expect(getStateAfterStateChange('solid', 'liquid', simpleMatterDefinition).name).toBe('liquid')
    expect(isValidStateChange('liquid', 'gas', simpleMatterDefinition)).toBeTruthy()
    expect(getStateAfterStateChange('liquid', 'gas', simpleMatterDefinition).name).toBe('gas')
  })

  it('should be invalid state changes', async () => {
    expect(isValidStateChange('liquid', 'solid', simpleMatterDefinition)).toBeFalsy()
    expect(getStateAfterStateChange('liquid', 'solid', simpleMatterDefinition)).toBeUndefined()
    expect(isValidStateChange('gas', 'liquid', simpleMatterDefinition)).toBeFalsy()
    expect(getStateAfterStateChange('gas', 'liquid', simpleMatterDefinition)).toBeUndefined()
    expect(isValidStateChange('gas', 'solid', simpleMatterDefinition)).toBeFalsy()
    expect(getStateAfterStateChange('gas', 'solid', simpleMatterDefinition)).toBeUndefined()
    expect(isValidStateChange('solid', 'gas', simpleMatterDefinition)).toBeFalsy()
    expect(getStateAfterStateChange('solid', 'gas', simpleMatterDefinition)).toBeUndefined()
  })

  it('should be valid transitions', async () => {
    expect(isValidTransition('solid', 'melt', simpleMatterDefinition)).toBeTruthy()
    expect(getStateAfterTransition('solid', 'melt', simpleMatterDefinition).name).toBe('liquid')
    expect(isValidTransition('liquid', 'vaporize', simpleMatterDefinition)).toBeTruthy()
    expect(getStateAfterTransition('liquid', 'vaporize', simpleMatterDefinition).name).toBe('gas')
  })

  it('should be not valid transitions', async () => {
    expect(isValidTransition('liquid', 'melt', simpleMatterDefinition)).toBeFalsy()
    expect(getStateAfterTransition('liquid', 'melt', simpleMatterDefinition)).toBeUndefined()
    expect(isValidTransition('gas', 'melt', simpleMatterDefinition)).toBeFalsy()
    expect(getStateAfterTransition('gas', 'melt', simpleMatterDefinition)).toBeUndefined()
    expect(isValidTransition('solid', 'vaporize', simpleMatterDefinition)).toBeFalsy()
    expect(getStateAfterTransition('solid', 'vaporize', simpleMatterDefinition)).toBeUndefined()
    expect(isValidTransition('gas', 'vaporize', simpleMatterDefinition)).toBeFalsy()
    expect(getStateAfterTransition('gas', 'vaporize', simpleMatterDefinition)).toBeUndefined()
  })



})
