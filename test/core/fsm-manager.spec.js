/* eslint-env jest */
const { createFsmManager } = require('../../src/core/fsm-manager')
const { createMemKeystore } = require('../../src/core/storage-strategies/strategy-memory')
const { createStrategyMemory } = require('../../src/core/storage-strategies/strategy-memory')
const { createStrategyMongo } = require('../../src/core/storage-strategies/strategy-mongo')
const { createStrategyRedis } = require('../../src/core/storage-strategies/strategy-redis')
const { matterMachineDefinition } = require('./../common')
const MongoClient = require('mongodb')
const redis = require('redis')
const uuid = require('uuid')
const util = require('util')
// const sleep = require('sleep-promise')

let fsmManager
let createStorageStrategy
let suiteRunId

let mongoDatabase
let redisClient

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'mem'

beforeEach(async () => {
  suiteRunId = `${uuid.v4()}`
  if (STORAGE_TYPE === 'mem') {
    // we are careful here to make sure that any fsmManagerMem created will share the same in-mem storage
    let keystores = {}
    createStorageStrategy = (fsmNamespace) => {
      if (!keystores[fsmNamespace]) {
        keystores[fsmNamespace] = createMemKeystore()
      }
      return createStrategyMemory(keystores[fsmNamespace])
    }
  } else if (STORAGE_TYPE === 'mongodb') {
    const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
    const asyncMongoConnect = util.promisify(MongoClient.connect)
    const mongoHost = await asyncMongoConnect(MONGO_URL)
    mongoDatabase = await mongoHost.db(`UNIT-TEST-STATEMACHINE`)
    createStorageStrategy = async (fsmNamespace) => {
      const collection = await mongoDatabase.collection(fsmNamespace)
      return createStrategyMongo(collection)
    }
  } else if (STORAGE_TYPE === 'redis') {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
    redisClient = redis.createClient(REDIS_URL)
    createStorageStrategy = (fsmNamespace) => {
      return createStrategyRedis(redisClient, fsmNamespace)
    }
  } else {
    throw Error(`Unknown storage type '${STORAGE_TYPE}'.`)
  }
  let storageStrategy = await createStorageStrategy(suiteRunId)
  fsmManager = createFsmManager(storageStrategy, matterMachineDefinition)
})

describe('state machine manager', () => {
  it('state machines from factory should have separate states', async () => {
    // act
    const stateMachine1 = await fsmManager.fsmCreate(`1`)
    const stateMachine2 = await fsmManager.fsmCreate(`2`)

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

  it('should return all managed state machines', async () => {
    // act
    await fsmManager.fsmCreate(`1`)
    const stateMachine2 = await fsmManager.fsmCreate(`2`)
    await stateMachine2.transitionStart('melt')
    const machines = await fsmManager.fsmFullLoadMany()
    // assert
    expect(machines).toBeDefined()
    expect(machines.length).toBe(2)
    const loadedMachine = machines.find(m => m.fsmId === `1`)
    const loadedMachine2 = machines.find(m => m.fsmId === `2`)
    expect(loadedMachine).toBeDefined()
    expect(loadedMachine2).toBeDefined()
    expect(loadedMachine.fsmData.state).toBe('solid')
    expect(loadedMachine.fsmData.transition).toBe(null)
    expect(loadedMachine2.fsmData.state).toBe('solid')
    expect(loadedMachine2.fsmData.transition).toBe('melt')
  })

  it('should retrieve all state machines', async () => {
    // arrange
    for (let i = 0; i < 100; i++) {
      await fsmManager.fsmCreate(i.toString())
    }
    // act
    const machines = await fsmManager.fsmFullLoadMany()
    // assert
    expect(machines.length).toBe(100)
  })

  it('should retrieve 10 machines', async () => {
    // arrange
    for (let i = 1; i <= 100; i++) {
      await fsmManager.fsmCreate(i.toString())
    }
    // act
    const machines = await fsmManager.fsmFullLoadMany(null, 10)
    // assert
    expect(machines.length).toBe(10)
  })

  it('should sort by descending create time by default', async () => {
    // arrange
    for (let i = 1; i <= 100; i++) {
      await fsmManager.fsmCreate(i.toString())
    }
    // act
    const machines = await fsmManager.fsmFullLoadMany(0, 10)
    // assert
    expect(machines.length).toBe(10)
    expect(machines[0].fsmId).toBe('100')
    expect(machines[9].fsmId).toBe('91')
  })
})
