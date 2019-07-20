# Javascript Finite State Machine
Lightweight Javascript finite state machine implementation with modular persistence. 

- **Where do you want to store state of your state machines?** Memory? Redis? Mongo? Elsewhere? Wherever you like!

- **How do you want to manage and identify your state machines?** Single key? Multiple keys? Ordered set? However you like.

The state machine can work with any data layer, however this module comes with batteries included. There's
3 storage implementations
- memory
- redis
- mongodb

whereas each identifies machines by single ID.  

But let's take a step back and star from scratch, shall we?

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
    { name: 'off', metadata: { 'can-pass': false } },
    { name: 'red', metadata: { 'can-pass': false } },
    { name: 'orange', metadata: { 'can-pass': false } },
    { name: 'green', metadata: { 'can-pass': true } }
  ],
  transitions: [
    { name: 'next', from: 'red', to: 'orange' },
    { name: 'next', from: 'orange', to: 'green' },
    { name: 'next', from: 'green', to: 'red' },
    { name: 'disable', from: 'red', to: 'off' },
    { name: 'disable', from: 'orange', to: 'off' },
    { name: 'disable', from: 'green', to: 'off' },
    { name: 'enable', from: 'off', to: 'red' }
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
  const fsmManager = createFsmManagerMem(semaphoreDefinition, memStore)
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
  console.log(await sema1.getState())
  
  // function doTransition(transitionName) invokes transitions. If the transition is valid according to
  // provided FSM definition, machine changes its state.
  await sema1.doTransition('enable')
  sema1state = await sema1.getState()
  console.log(`Semaphore1 is in state ${sema1state}.`)
}
runExample()
```


## 2 step transitioning
You can choose to perform transitions in 2 steps. First start of transition and later finalizing started transition.
```javascript
async function runExample () {
  let memStore = createMemKeystore()
  const fsmManager = createFsmManagerMem(semaphoreDefinition, memStore)
  const sema1 = await fsmManager.loadMachine('id1')
  let sema1state = await sema1.getState()
  console.log(`Semaphore1 is in state ${sema1state}.`)

  // There's also option to do transition in 2 steps. This might come handy if you can't
  // perform related state changes atomically.
  await sema1.transitionStart('enable')
  await sleep(100) // do some IO operations
  // sema1.getState() this would throw, machine state is not clear as its currently transitioning
  // sema1.doTransition('next') this would throw, because machine is already transitioning
  await sema1.transitionFinish()
  sema1state = await sema1.getState()
  console.log(`Semaphore1 is in state ${sema1state}.`)
}
runExample()
```
This will print
```
Semaphore1 is in state off.
Semaphore1 is in state red.
```

# Reloading 
As FSM Manager handles machine persistence, you can create machine, do some transitions and forget about.
Then later ask FSM Manager for the machine with the same ID and you have it back! 
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
 

