# Transitioning states
1. Sometimes you know that execution of routing will result in attempt to go through one particular transition. In
such case you could let the state machine know that you are starting transition, execute route and if everything went fine,
finalize the transition. 
2. Sometimes you execute route where you know one transation of a set will be used, but you don't know ahead of time
which transaction it's going to be. 


# Asynchronicity
One of the problems with state machines in asynchronous systems are following:

1. You start routing and make database changes. Before the new state of given entity based on routine results is persisted 
based on its results, the systems shuts down, leaving the entity in actually inconsistent state.
 
   Explicit state is actually redundant information. The state should be defined data purely defining the entity. In order
   for "label" state management to work, the system would need to support rollbacks and be able to recognize when 
   one needs to be performed. Hover, things are easier with label state as it is basically grouping up many states into a few states.
   
   One possible way to solve this is to give up fixing inconsistent machines, but throw them away. But for that, we would need to 
   be able to detect that. We could do that if we persist not only state, but also start and ends of transitions. That way
   we could detect that certain machine might be inconsistent if transition started but didn't persist final transition state.
   In such approach you have to first consider what will be implications of throwing out such broken machines.   

2. Race conditions - if two routines are executing in parallel, operating against the same resource / state machine,
both persist 2 different states which rewrite each other. This can be mitigated by locks. 

