/* eslint-env jest */
const { buildSourceTransitionDestinationMap } = require('../../src/core/fsm-definition-utils')
describe('state machine definitions transformations', () => {
  it('should generate the map from transitions definition', async () => {
    const transitionDefinition = {
      melt: [{ from: 'solid', to: 'liquid' }],
      vaporize: [{ from: 'liquid', to: 'gas' }]
    }
    const map = buildSourceTransitionDestinationMap(transitionDefinition)
    expect(map.solid.melt).toBe('liquid')
    expect(map.liquid.vaporize).toBe('gas')
    expect(Object.keys(map).length).toBe(2)
    expect(Object.keys(map.solid).length).toBe(1)
    expect(Object.keys(map.liquid).length).toBe(1)
  })
})
