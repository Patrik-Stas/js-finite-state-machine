const { createStateMachine } = require('./core/fsm')
const { createInMemStateStorage } = require('./core/factories/fsm-manager-mem')
const { createRedisStateStorage } = require('./core/factories/fsm-manager-redis')
const { createMongoStateStorage } = require('./core/factories/fsm-manager-mongo')
const { createStateMachineFactory } = require('./core/factories/fsm-manager-mem')
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
