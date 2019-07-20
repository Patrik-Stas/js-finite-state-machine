/* eslint-env jest */
const { createFsmDefinitionWrapper } = require('../../src/core/fsm-definition-wrapper')
const { assertIsValidMachineDefinition } = require('../../src/core/fsm-definition-wrapper')
const { matterMachineDefinition } = require('./../common')

const simpleMatterDefinition = {
  initialState: 'solid',
  name: 'matter',
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
      name: 'matter',
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
      name: 'matter',
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

  it('should throw error if transition refers unknown destination state', async () => {
    const definition = {
      name: 'matter',
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

  it('should throw error if transition refers unknown source state', async () => {
    const definition = {
      name: 'matter',
      initialState: 'solid',
      states: [
        { name: 'solid' },
        { name: 'liquid' }
      ],
      transitions: [
        { name: 'melt', from: 'solid', to: 'liquid' },
        { name: 'foo', from: 'plasma', to: 'gas' }
      ]
    }
    let thrownError
    try {
      assertIsValidMachineDefinition(definition)
    } catch (err) {
      thrownError = err
    }
    expect(thrownError.toString().includes(`Transition ${JSON.stringify({ name: 'foo', from: 'plasma', to: 'gas' })} refers state from='plasma' which was not declared.`)).toBeTruthy()
  })

  it('should find full state by state name', async () => {
    const definition = {
      name: 'matter',
      initialState: 'solid',
      states: [
        { name: 'gas', metadata: { label: 'foo' } },
        { name: 'solid', metadata: { label: 'bar' } }
      ],
      transitions: []
    }
    const definitionWrapper = createFsmDefinitionWrapper(definition)
    const stateFull = definitionWrapper.findStateDefinitionByName('gas', definition)
    expect(stateFull).toBeDefined()
    expect(stateFull.name).toBe('gas')
    expect(stateFull.metadata).toBeDefined()
    expect(stateFull.metadata.label).toBe('foo')
  })

  it('should return undefined if name is not matching any state from state definition', async () => {
    const definition = {
      name: 'matter',
      initialState: 'solid',
      states: [
        { name: 'solid', metadata: { label: 'bar' } }
      ],
      transitions: []
    }
    const definitionWrapper = createFsmDefinitionWrapper(definition)
    const state = definitionWrapper.findStateDefinitionByName('gas', definition)
    expect(state).toBeUndefined()
  })

  it('should be valid transition', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    expect(wrapper.isValidTransition('solid', 'melt')).toBeTruthy()
    expect(wrapper.getStateAfterTransition('solid', 'melt').name).toBe('liquid')
    expect(wrapper.isValidTransition('liquid', 'vaporize')).toBeTruthy()
    expect(wrapper.getStateAfterTransition('liquid', 'vaporize').name).toBe('gas')
  })

  it('should be invalid state changes', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    expect(wrapper.isValidTransition('liquid', 'melt')).toBeFalsy()
    expect(wrapper.getStateAfterTransition('liquid', 'melt')).toBeUndefined()
    expect(wrapper.isValidTransition('gas', 'melt')).toBeFalsy()
    expect(wrapper.getStateAfterTransition('gas', 'melt')).toBeUndefined()
    expect(wrapper.isValidTransition('gas', 'vaporize')).toBeFalsy()
    expect(wrapper.getStateAfterTransition('gas', 'vaporize')).toBeUndefined()
    expect(wrapper.isValidTransition('solid', 'vaporize')).toBeFalsy()
    expect(wrapper.getStateAfterTransition('solid', 'vaporize')).toBeUndefined()
  })

  it('should be valid transitions', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    expect(wrapper.isValidTransition('solid', 'melt')).toBeTruthy()
    expect(wrapper.getStateAfterTransition('solid', 'melt').name).toBe('liquid')
    expect(wrapper.isValidTransition('liquid', 'vaporize')).toBeTruthy()
    expect(wrapper.getStateAfterTransition('liquid', 'vaporize').name).toBe('gas')
  })

  it('should be not valid transitions', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    expect(wrapper.isValidTransition('liquid', 'melt')).toBeFalsy()
    expect(wrapper.getStateAfterTransition('liquid', 'melt')).toBeUndefined()
    expect(wrapper.isValidTransition('gas', 'melt')).toBeFalsy()
    expect(wrapper.getStateAfterTransition('gas', 'melt')).toBeUndefined()
    expect(wrapper.isValidTransition('solid', 'vaporize')).toBeFalsy()
    expect(wrapper.getStateAfterTransition('solid', 'vaporize')).toBeUndefined()
    expect(wrapper.isValidTransition('gas', 'vaporize')).toBeFalsy()
    expect(wrapper.getStateAfterTransition('gas', 'vaporize')).toBeUndefined()
  })

  it('should find transition by from and to state', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    const transition = wrapper.findTransitionByName('solid', 'melt')
    expect(transition.from).toBe('solid')
    expect(transition.to).toBe('liquid')
    expect(transition.name).toBe('melt')
  })

  it('should return undefined if transition between 2 states can not be found', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    const transition = wrapper.findTransitionByName('solid', 'vaporize')
    expect(transition).toBeUndefined()
  })

  it('should find transition by name from state', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    const transition = wrapper.findTransitionByName('solid', 'melt')
    expect(transition.from).toBe('solid')
    expect(transition.to).toBe('liquid')
    expect(transition.name).toBe('melt')
  })

  it('should return undefined if transition name is not defined', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    const transition = wrapper.findTransitionByName('solid', 'foobar')
    expect(transition).toBeUndefined()
  })

  it('should return undefined if state name is not defined', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    const transition = wrapper.findTransitionByName('foobar', 'melt')
    expect(transition).toBeUndefined()
  })
})
