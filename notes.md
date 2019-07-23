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


# Operations vs transitions
In applications, sometimes you execute a procedure which you know will maybe attempt one of several operations. 
Let's see on example. We have application where user uploads a document and then an admin has to approve or reject
the document. 

```javascript

init   ------<upload>----->  document-pending   ------<admin approves>-----> approve
                                       |
                                       +--------------<admin rejects>--------> reject 

```

So when you write the approval/rejection 
... loking at above, the problem is maybe not in knowing which one of N transitions it will be, but rather in 
desire to check possibility of transitions before trying to execute code required for determining transition / required
for doing a transition

`a ----Q--- > b`

But what if, in order to do Q you have to do expensive computation based of which you decide whether you go to Q or not.
But if you are not in state letting you do Q, why would you even try do that computation when it's already obvious as
impossible by looking at current state machine graph?

The thing is sometimes you have bussines logic routine which:
- it can execute 1 of N transitions and you don't know which one it will be ahead
- it might execute transition, or might not - which is quite common and you might want to keep your machine simplistic with minimum loops


# Loop minimization
- Should every failed attempt to do transition be represented as loop? For example, if a transition is conditioned by 
an argument value passed by user (only do transition if `FOO > 1000`). Then if `FOO=999`, should this be represented by 
loop transition? It depends - probably only if it is important for you to track that such event happened. Otherwise 
you can just do nothing. 



# FSM Definition format
Currently we have
```javascript
matterMachineDefinition = {
  type: 'matter',
  initialState: 'solid',
  states: [
    { name: 'solid',  metadata: { 'tangible': true } },
    { name: 'liquid', metadata: { 'tangible': true } },
    { name: 'gas',    metadata: { 'tangible': false } }
  ],
  transitions: [
    { name: 'melt',     from: 'solid', to: 'liquid' },
    { name: 'freeze',   from: 'liquid', to: 'solid' },
    { name: 'vaporize', from: 'liquid', to: 'gas' },
    { name: 'condense', from: 'gas', to: 'liquid' }
  ]
}
```
it would probably be practical to use maps instead of arrays
```javascript
matterMachineDefinition = {
  type: 'matter',
  initialState: 'solid',
  states: {
    solid:  { 'tangible': true }, 
    liquid: { 'tangible': true }, 
    gas:    { 'tangible': false }
  },
  transitions: {
    melt:     { from: 'solid',  to: 'liquid' },
    freeze:   { from: 'liquid', to: 'solid' },
    vaporize: { from: 'liquid', to: 'gas' },
    condense: { from: 'gas',    to: 'liquid' }
  }
}

# And now we will be able to refer states from code and easily refactor and modify definitions!
matterMachineDefinition.states.gas 
``` 
