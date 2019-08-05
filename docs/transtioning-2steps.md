## 2 step transitioning
You can choose to perform transitions in 2 steps. First start of transition and later 
finalizing started transition.
```javascript
async function runExample () {
  let memStore = createMemKeystore()
  const fsmManager = createFsmManagerMem(semaphoreDefinition, memStore)
  const sema1 = await fsmManager.machineCreate('semaphore1')
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
