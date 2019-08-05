This seems like a good place to warn you about dangerous trap - race conditions! Node event loop is running
in a single thread, but that doesn't mean race conditions can't happen when there's an IO involved. 
How? Let's see.
 ```javascript
 async function runExample() {
   let strategyMemory = createStrategyMemory()
   const fsmManager = createFsmManager(strategyMemory, semaphoreDefinition)
   let semaphore1 = await fsmManager.machineCreate('id1')
   await semaphore1.doTransition('enable')
   let semaphore2 = await fsmManager.machineLoad('id1')
   // the objects semi1 and semi2 themselves are stateless and all data is always  
   // retrieved from storage we do have 2 representatives of the same machine. hmmm. 
   semaphore1.doTransition('next')
   semaphore2.doTransition('disable')
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
