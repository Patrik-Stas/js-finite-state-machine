# Javascript Finite State Machine
Lightweight Javascript finite state machine implementation with generic state persistence. 

Where do you want to store state of your state machines? Memory? Redis? Mongo? File system? Something else? Whatver you like.

This state machine implementation which puts no assumptions on state persistence. It comes by default with
3 storage implementations:
- memory
- redis
- mongodb

But let's take a step back and star from scratch, shall we?

## Defining state machine
First we need to specify our state machine. Our state machines are defined by:
- initial state
- states
- transitions 

Example:
```javascript
const matterMachineDefinition = {
  initialState: 'solid',
  states: [
    { name: 'solid', metadata: { 'tangible': true } },
    { name: 'liquid', metadata: { 'tangible': true } },
    { name: 'gas', metadata: { 'tangible': false } }
  ],
  transitions: [
    { name: 'melt', from: 'solid', to: 'liquid' },
    { name: 'freeze', from: 'liquid', to: 'solid' },
    { name: 'vaporize', from: 'liquid', to: 'gas' },
    { name: 'condense', from: 'gas', to: 'liquid' }
  ]
}
```
Example inspired by different JS state machine [implementation](https://github.com/jakesgordon/javascript-state-machine) by Jakes Gordon.

## Creating / Loading state machines
Before you create/load state machine, you need to decided on the data store. For example, let's start with MongoDb as our state data layer.

```javascript
async function runExample() {
  mongoHost = await util.promisify(MongoClient.connect)('mongodb://localhost:27017')
  mongoDatabase = await mongoHost.db(`machines`)
  collection = await mongoDatabase.collection(`matter`)
  
  generateTestcaseMachine = createInMongoMachineGenerator(matterMachineDefinition, collection)
  little = await generateTestcaseMachine('little-ice-cube')
  big = await generateTestcaseMachine('big-ice-cube')
  
  console.log(`Little has state: ${await little.getState()}`)
  console.log(`Big has state: ${await big.getState()}`)
 
}
runExample()
```

TODO: Finish readme, add executable demo


 

