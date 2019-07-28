# Javascript Finite State Machine (version 1.0.x)
Pretty simplistic Finite State Machines (FSMs) with modular state persistence.  No callbacks, 
triggers, just doing transitions, checking the rules, persisting and loading the states. 

- **Where do you want to store state of your state machines?** Memory? Redis? Mongo? 
Elsewhere? Wherever you like!

- **How do you want to manage and identify your state machines?** Single key? 
Multiple keys? Ordered set? However you like.

The state machine can work with any data layer, however this module comes with batteries 
included. 3 storage implementations are included in the module
- memory
- redis
- mongodb

Each of these implementations identifies machines by single id.

But let's take a step back and star from scratch, shall we?

# Installation
```
npm install @patrikstas/finite-state-machine
```
or 
```
yarn add @patrikstas/finite-state-machine
```

# Tutorial
You have 2 options:
1. install the module and start using it in your project based on examples bellow,
2. or clone repo, try to run demo and examples below

If you decide to go for the second option, this is how you can run demo:
```bash
git clone https://github.com/Patrik-Stas/js-finite-state-machine.git
cd  js-finite-state-machine
npm install
npm run demo
```

## Defining state machine
First we need to specify our state machine. Our state machines are defined by:
- initial state
- states
- transitions 

Example:
```javascript
const semaphoreDefinition = {
  initialState: 'off',
  states: [
    { name: 'off',    metadata: { 'can-pass': false } },
    { name: 'red',    metadata: { 'can-pass': false } },
    { name: 'orange', metadata: { 'can-pass': false } },
    { name: 'green',  metadata: { 'can-pass': true } }
  ],
  transitions: [
    { name: 'next',    from: 'red',    to: 'orange' },
    { name: 'next',    from: 'orange', to: 'green' },
    { name: 'next',    from: 'green',  to: 'red' },
    { name: 'disable', from: 'red',    to: 'off' },
    { name: 'disable', from: 'orange', to: 'off' },
    { name: 'disable', from: 'green',  to: 'off' },
    { name: 'enable',  from: 'off',    to: 'red' }
  ]
}
```

## Creating / Loading state machines
The machines are managed by FSM Managers. They handle all the logic of storing and retrieving
machines. FSM Managers also decides how to identify machines - it might be single key, unordered or
ordered set of keys.
The library comes by default with 3 implementations (in-memory storage, mongodb, redis), all sharing the
same interface. However this might not fit your need so feel free to implement your own!

Okay, let's first create some in-memory state machine.

```javascript
async function runExample() {
  let memStore = createMemKeystore()
  // we are using the the machine definition 'semaphoreDefinition' defined above
  const fsmManager = createFsmManagerMem(semaphoreDefinition, memStore)
  
  // creates object representing state machine identified by ID 'id1' in the storage
  // if no machine 'id1' exists, machine is created, starting in the state 'initialState' 
  // in machine definition
  const sema1 = await fsmManager.loadMachine('id1')
  console.log(await sema1.getState())
}
runExample()
```

## Transitioning
The machine will only perform a transitions as far as it's valid transition according to current machine
state and machine definition.
```javascript
async function runExample() {
  let memStore = createMemKeystore()
  const fsmManager = createFsmManagerMem(semaphoreDefinition, memStore)
  const sema1 = await fsmManager.loadMachine('id1')
  console.log(`Semaphore1 is in state ${ await sema1.getState()}.`)
  
  // function doTransition(transitionName) invokes transitions. If the transition 
  // is valid according to provided FSM definition, machine changes its state.
  await sema1.doTransition('enable')
  console.log(`Semaphore1 is in state ${ await sema1.getState()}.`)
}
runExample()
```
This will print
```
Semaphore1 is in state off.
Semaphore1 is in state red.
```


## 2 step transitioning
You can choose to perform transitions in 2 steps. First start of transition and later 
finalizing started transition.
```javascript
async function runExample () {
  let memStore = createMemKeystore()
  const fsmManager = createFsmManagerMem(semaphoreDefinition, memStore)
  const sema1 = await fsmManager.loadMachine('id1')
  console.log(`Semaphore1 is in state ${ await sema1.getState()}.`)

  // There's also option to do transition in 2 steps. This might come handy 
  // if you can't perform related state changes atomically.
  await sema1.transitionStart('enable')
  await sleep(100) // do some IO operations
  // sema1.getState() this would throw, machine state is not clear as its currently transitioning
  // sema1.doTransition('next') this would throw, because machine is already transitioning
  await sema1.transitionFinish()
  console.log(`Semaphore1 is in state ${ await sema1.getState()}.`)
}
runExample()
```
This will print
```
Semaphore1 is in state off.
Semaphore1 is in state red.
```

# Reloading 
As FSM Manager handles machine persistence, you can create machine, 
do some transitions  and forget about. Then later ask FSM Manager for 
the machine with the same ID and you have it back! 
```javascript
async function runExample() {
  let memStore = createMemKeystore()
  const fsmManager = createFsmManagerMem(semaphoreDefinition, memStore)
  let sema1 = await fsmManager.loadMachine('id1')
  
  await sema1.doTransition('enable')
  sema1state = await sema1.getState()
  console.log(`Semaphore1 is in state ${sema1state}.`)
  // let's forget about our semaphore instance for now
  delete sema1
  
  // just to find it later again!
  const sema1Reloaded = await fsmManager.loadMachine('id1')
  sema1state = await sema1Reloaded.getState()
  console.log(`Reloaded Semaphore1 is in state ${sema1state}.`)
}
runExample()
```
This will print
```
Semaphore1 is in state red.
Reloaded Semaphore1 is in state red.
```

This seems like a good place to warn you about a terrible trap! Race conditions! Node event loop is running
in a single thread, but that doesn't mean race conditions can't happen when there's IO involved. 
How? Let's see.
 ```javascript
 async function runExample() {
   let memStore = createMemKeystore()
   const fsmManager = createFsmManagerMem(semaphoreDefinition, memStore)
   let sema1 = await fsmManager.loadMachine('id1')
   await sema1.doTransition('enable')
   let sema2 = await fsmManager.loadMachine('id1')
   // the objects semi1 and semi2 themselves are stateless and all data is always  
   // retrieved from storage we do have 2 representatives of the same machine. hmmm. 
   sema1.doTransition('next')
   sema2.doTransition('disable')
 }
 runExample()
 ```
 When you try to do transition, the machine always checks its current state in storage, checks that
 the requested transition is doable from that state and if yes, it performs the transition and changes
 current state.
 In ideal case, the machine will first run next transition and then it will be disabled. But what if:
 - execution of `next` begins. It check current state and it's `red`. `next` is valid transition 
 into `orange`.
 - execution of `disable` reads current data before state in storage changes to `orange`. it seems that 
 `disable` is valid transition from state `red` into `off`. 
 - This is where trouble beings. Because transitions are not atomic (2 io operations: read current 
 state, write updated state), we have now 2 simultaneous transitions running at the same time. 
 - This might cause invalid transition order and inconsistent transition history records. Assuming that
 update of `disable` transition reaches database first (absolutely possible), we'll end up with following
 transition history 
 ```
off -> enable
red -> disable
red -> next
``` 
and state `orange`. The history of transitions is inconsistent and we can't really tell what happened.

In this example, the problem was pretty obvious. But if you are changing states of machines as results
of HTTP Requests hitting up your server, described scenario might be harder to see. 

The bottom line is that this library doesn't handle race conditions and you need to take care of 
that yourself using some sort of locking mechanism. You need to assure atomicity of a single state 
machine updates yourself.  
 
# History
```javascript
async function runExample() {
  let memStore = createMemKeystore()
  const fsmManager = createFsmManagerMem(semaphoreDefinition, memStore)
  const sema1 = await fsmManager.loadMachine('id1')
  console.log(await machine1.getState())
  await sema1.doTransition('enable')
  await sema1.doTransition('next')
  const sema1Reloaded = await fsmManager.loadMachine('semaphore1')
  const history = await sema1Reloaded.getHistory()
  console.log(`Current history of Semaphore1 is: ${JSON.stringify(history, null, 2)}`)
  // Current history of Semaphore1 is: [
  //   {
  //     "state": "off",
  //     "transition": "enable"
  //   },
  //   {
  //     "state": "red",
  //     "transition": "next"
  //   }
}
runExample()
```

# Using different storages
The whole thing becomes more useful once we start to use persistent storage implementations!
The module comes with 3 reference implementations of storage layer - memory, MongoDB and Redis.
We've previously used in-memory storage for case of simplicity. Let's try Mongo and Redis.

#### Mongo storage
```javascript
async function runExample() {
  const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
  const asyncMongoConnect = util.promisify(MongoClient.connect)
  const mongoHost = await asyncMongoConnect(MONGO_URL)
  const mongoDatabase = await mongoHost.db(`UNIT-TEST-STATEMACHINE`)
  const collection = await mongoDatabase.collection('FSM-DEMO')
  return createFsmManagerMdb(semaphoreDefinition, collection)
  
  // and we can use it exactly like we did previously
  let sema1 = await fsmManager.loadMachine('id1')
  await sema1.doTransition('enable')
  console.log(`Semaphore1 is in state ${await sema1.getState()}.`)
    
}
runExample()
```

#### Redis storage
```javascript
async function runExample() {
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
  const redisClient = redis.createClient(REDIS_URL)
  return createFsmManagerRedis(semaphoreDefinition, redisClient, 'fsm-demo')   
  
  // and we can use it exactly like we did previously
  let sema1 = await fsmManager.loadMachine('id1')
  await sema1.doTransition('enable')
  console.log(`Semaphore1 is in state ${await sema1.getState()}.`)
}
runExample()
```

## Tweaking storage for your needs
All provided storage implementations share the same interface, but it's very likely you will have just
a slightly different needs. Maybe you want to organize the data in database in a different way, or maybe
you want to identify each machine by 2 keys, instead of only single id.

In that case I encourage you to look into `src/core/fsm-storage` reference implementations and use them
as starters for your implementations. 

## Digging deeper
Please take look at `test/core/fsm-identified-by-id.spec.js` to see more examples for deeper understanding
of this FSM implementation.




