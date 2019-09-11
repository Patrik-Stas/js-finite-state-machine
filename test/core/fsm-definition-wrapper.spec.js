/* eslint-env jest */
const { createFsmDefinitionWrapper } = require('../../src/core/fsm-definition-wrapper')
const { assertIsValidMachineDefinition } = require('../../src/core/fsm-definition-wrapper')
const { matterMachineDefinition } = require('./../common')

const simpleMatterDefinition = {
  initialState: 'solid',
  name: 'matter',
  states: {
    solid: 'solid',
    liquid: 'liquid',
    gas: 'gas'
  },
  transitions: {
    melt: 'melt',
    vaporize: 'vaporize'
  },
  definitionTransitions: {
    melt: [{ from: 'solid', to: 'liquid' }],
    vaporize: [{ from: 'liquid', to: 'gas' }]
  }
}

const machineWithStyles = {
  type: 'matter',
  initialState: 'solid',
  states: {
    solid: 'solid',
    liquid: 'liquid',
    gas: 'gas'
  },
  transitions: {
    melt: 'melt',
    freeze: 'freeze',
    vaporize: 'vaporize',
    condense: 'condense'
  },
  definitionStates: {
    solid: { metadata: { tangible: true }, dot: { shape: 'square' } },
    liquid: { metadata: { tangible: true }, dot: { style: 'filled', fillcolor: 'orange' } },
    gas: { metadata: { tangible: false }, dot: { shape: 'circle', style: 'filled', fillcolor: 'grey' } }
  },
  definitionTransitions: {
    melt: [{ from: 'solid', to: 'liquid' }],
    freeze: [{ from: 'liquid', to: 'solid' }],
    vaporize: [{ from: 'liquid', to: 'gas' }],
    condense: [{ from: 'gas', to: 'liquid' }]
  }
}

describe('state machine definition utils', () => {
  it('should not throw if machine definition is valid', async () => {
    assertIsValidMachineDefinition(matterMachineDefinition)
  })

  it('definitionStates should be optional', async () => {
    let modified = matterMachineDefinition
    modified['definitionStates'] = null
    assertIsValidMachineDefinition(modified)
  })

  it('should throw error if definitionStates contains state not declared in states', async () => {
    const definition = {
      name: 'matter',
      initialState: 'gas',
      states: {
        gas: 'gas'
      },
      transitions: {},
      definitionStates: {
        gasoline: { metadata: {}, dot: {} }
      },
      definitionTransitions: {}
    }
    let thrownError
    try {
      assertIsValidMachineDefinition(definition)
    } catch (err) {
      thrownError = err
    }
    expect(thrownError.toString().includes('definitionStates is specifying state called gasoline but no such state was listed under states')).toBeTruthy()
  })

  it('should throw error if definitionTransitions contains transition not declared in transitions', async () => {
    const definition = {
      name: 'matter',
      initialState: 'gas',
      states: {
        gas: 'gas',
        liquid: 'liquid'
      },
      transitions: {
        condense: 'condense'
      },
      definitionTransitions: {
        condense: [{ from: 'gas', to: 'liquid' }],
        vaporize: [{ from: 'liquid', to: 'gas' }]
      }
    }
    let thrownError
    try {
      assertIsValidMachineDefinition(definition)
    } catch (err) {
      thrownError = err
    }
    console.log(thrownError.toString())
    expect(thrownError.toString().includes('definitionTransitions is specifying transition called vaporize but no such transition was listed under transitions')).toBeTruthy()
  })

  it('should throw error if initial state is not defined', async () => {
    const definition = {
      name: 'matter',
      states: {
        gas: 'gas'
      },
      transitions: {},
      definitionStates: {},
      definitionTransitions: {}
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
      states: {
        gas: 'gas'
      },
      transitions: {},
      definitionStates: {},
      definitionTransitions: {}
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
      states: {
        solid: 'solid',
        liquid: 'liquid'
      },
      transitions: {
        melt: 'melt',
        vaporize: 'vaporize'
      },
      definitionTransitions: {
        melt: [{ from: 'solid', to: 'liquid' }],
        vaporize: [{ from: 'liquid', to: 'gas' }]
      }
    }
    let thrownError
    try {
      assertIsValidMachineDefinition(definition)
    } catch (err) {
      thrownError = err
    }
    expect(thrownError.toString()).toBe(`Error: Transition 'vaporize' refers state to='gas' which was not declared.`)
  })

  it('should throw error if transition refers unknown source state', async () => {
    const definition = {
      name: 'matter',
      initialState: 'solid',
      states: {
        solid: 'solid',
        liquid: 'liquid'
      },
      transitions: {
        melt: 'melt',
        foo: 'foo'
      },
      definitionTransitions: {
        melt: [{ from: 'solid', to: 'liquid' }],
        foo: [{ from: 'plasma', to: 'gas' }]
      }
    }
    let thrownError
    try {
      assertIsValidMachineDefinition(definition)
    } catch (err) {
      thrownError = err
    }
    expect(thrownError.toString()).toBe(`Error: Transition 'foo' refers state from='plasma' which was not declared.`)
  })

  it('should determine state name as valid', async () => {
    const definition = {
      name: 'matter',
      initialState: 'solid',
      states: {
        gas: 'gas',
        solid: 'solid'
      },
      transitions: {},
      definitionTransitions: {}
    }
    const definitionWrapper = createFsmDefinitionWrapper(definition)
    const isValid = definitionWrapper.isValidStateName('gas')
    expect(isValid).toBeTruthy()
    definitionWrapper.assertIsValidStateName('gas')
  })

  it('should determine state name as invalid', async () => {
    const definition = {
      name: 'matter',
      initialState: 'solid',
      states: {
        gas: 'gas',
        solid: 'solid'
      },
      statesMeta: {
        gas: { label: 'foo' },
        solid: { label: 'bar' }
      },
      transitions: {},
      definitionTransitions: {}
    }
    const definitionWrapper = createFsmDefinitionWrapper(definition)
    const isValid = definitionWrapper.isValidStateName('plasma')
    expect(isValid).toBeFalsy()
  })

  it('should throw if state name is invalid', async () => {
    const definition = {
      name: 'matter',
      initialState: 'solid',
      states: {
        gas: 'gas',
        solid: 'solid'
      },
      transitions: {},
      definitionTransitions: {}
    }
    const definitionWrapper = createFsmDefinitionWrapper(definition)
    let thrownError
    try {
      definitionWrapper.assertIsValidStateName('plasma')
    } catch (err) {
      thrownError = err
    }
    expect(thrownError.toString()).toBe('Error: Unknown state \'plasma\'. Known states: ["gas","solid"]')
  })

  it('should return undefined if name is not matching any state from state definition', async () => {
    const definition = {
      name: 'matter',
      initialState: 'solid',
      states: {
        solid: 'solid'
      },
      transitions: {},
      definitionTransitions: {}
    }
    const definitionWrapper = createFsmDefinitionWrapper(definition)
    const isValid = definitionWrapper.isValidStateName('gas')
    expect(isValid).toBeFalsy()
  })

  it('should be valid transition', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    expect(wrapper.isValidTransition('solid', 'melt')).toBeTruthy()
    expect(wrapper.getDestinationState('solid', 'melt')).toBe('liquid')
    expect(wrapper.isValidTransition('liquid', 'vaporize')).toBeTruthy()
    expect(wrapper.getDestinationState('liquid', 'vaporize')).toBe('gas')
  })

  it('should be invalid state changes', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    expect(wrapper.isValidTransition('liquid', 'melt')).toBeFalsy()
    expect(wrapper.getDestinationState('liquid', 'melt')).toBeUndefined()
    expect(wrapper.isValidTransition('gas', 'melt')).toBeFalsy()
    expect(wrapper.getDestinationState('gas', 'melt')).toBeUndefined()
    expect(wrapper.isValidTransition('gas', 'vaporize')).toBeFalsy()
    expect(wrapper.getDestinationState('gas', 'vaporize')).toBeUndefined()
    expect(wrapper.isValidTransition('solid', 'vaporize')).toBeFalsy()
    expect(wrapper.getDestinationState('solid', 'vaporize')).toBeUndefined()
  })

  it('should be valid transitions', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    expect(wrapper.isValidTransition('solid', 'melt')).toBeTruthy()
    expect(wrapper.getDestinationState('solid', 'melt')).toBe('liquid')
    expect(wrapper.isValidTransition('liquid', 'vaporize')).toBeTruthy()
    expect(wrapper.getDestinationState('liquid', 'vaporize')).toBe('gas')
  })

  it('should be not valid transitions', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    expect(wrapper.isValidTransition('liquid', 'melt')).toBeFalsy()
    expect(wrapper.getDestinationState('liquid', 'melt')).toBeUndefined()
    expect(wrapper.isValidTransition('gas', 'melt')).toBeFalsy()
    expect(wrapper.getDestinationState('gas', 'melt')).toBeUndefined()
    expect(wrapper.isValidTransition('solid', 'vaporize')).toBeFalsy()
    expect(wrapper.getDestinationState('solid', 'vaporize')).toBeUndefined()
    expect(wrapper.isValidTransition('gas', 'vaporize')).toBeFalsy()
    expect(wrapper.getDestinationState('gas', 'vaporize')).toBeUndefined()
  })

  it('should return undefined if transition between 2 states can not be found', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    const destination = wrapper.getDestinationState('solid', 'vaporize')
    expect(destination).toBeUndefined()
  })

  it('should find transition by name from state', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    const destination = wrapper.getDestinationState('solid', 'melt')
    expect(destination).toBe('liquid')
  })

  it('should return undefined if transition names are valid, but given transaction is not possible from source state', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    const destination = wrapper.getDestinationState('liquid', 'melt')
    expect(destination).toBeUndefined()
  })

  it('should throw if transition is unknown', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    let thrownError
    try {
      wrapper.getDestinationState('solid', 'foobar')
    } catch (err) {
      thrownError = err
    }
    expect(thrownError.toString()).toBe('Error: Unknown transition \'foobar\'. Known transitions: ["melt","vaporize"]')
  })

  it('should throw if state is unknown', async () => {
    const wrapper = createFsmDefinitionWrapper(simpleMatterDefinition)
    let thrownError
    try {
      wrapper.getDestinationState('foobar', 'melt')
    } catch (err) {
      thrownError = err
    }
    expect(thrownError.toString()).toBe('Error: Unknown state \'foobar\'. Known states: ["solid","liquid","gas"]')
  })

  it('should generate dotfile', async () => {
    const wrapper = createFsmDefinitionWrapper(machineWithStyles)
    const dot = wrapper.dotify()
    const expectedDot =
      'digraph {\n' +
      '    solid [ shape=square ]\n' +
      '    liquid [ style=filled  fillcolor=orange ]\n' +
      '    gas [ shape=circle  style=filled  fillcolor=grey ]\n' +
      '    solid -> liquid [label=melt];\n' +
      '    liquid -> solid [label=freeze];\n' +
      '    liquid -> gas [label=vaporize];\n' +
      '    gas -> liquid [label=condense];\n' +
      '}'
    expect(dot).toEqual(expectedDot)
  })
})
