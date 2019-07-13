const { createStateMachine } = require('./core/fsm')
const { createInMemStateStorage } = require('./state-stores/mem')
const { createRedisStateStorage } = require('./state-stores/redis')
const { createStateMachineFactory } = require('./core/fsm-factory')
const { assertIsValidMachineDefinition, dotifyDefinition } = require('./core/fsm-definition-wrapper')

module.exports = { createStateMachine, createStateMachineFactory, assertIsValidMachineDefinition, createInMemStateStorage, createRedisStateStorage, dotifyDefinition }
