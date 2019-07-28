# 2.0.0-dev.0
- Added `createMachine` and `machineExists` to storage implementations
- Changed behaviour of `loadMachine` - this would previously create new machine if the machine was not found. 
Now it will throw exception. You have to use `createMachine` to create new machines.


# 1.0.3
- First release with 3 storage reference implementations (memory, mongo, redis).
