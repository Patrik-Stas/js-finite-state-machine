const { createStateMachine } = require('./core/fsm')
const { createInMemStateStorage } = require('./core/factories/fsm-factory-mem')
const { createRedisStateStorage } = require('./core/factories/fsm-factory-redis')
const { createMongoStateStorage } = require('./core/factories/fsm-factory-mongo')
const { createStateMachineFactory } = require('./core/factories/fsm-factory-mem')
const { assertIsValidMachineDefinition, dotifyDefinition } = require('./core/fsm-definition-wrapper')

module.exports = {
  createStateMachine,
  createStateMachineFactory,
  assertIsValidMachineDefinition,
  createInMemStateStorage,
  createRedisStateStorage,
  createMongoStateStorage,
  dotifyDefinition
}
