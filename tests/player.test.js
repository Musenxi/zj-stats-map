import test from 'node:test'
import assert from 'node:assert/strict'
import { createStore } from '../src/data/store.js'
import { createPlayer } from '../src/ui/player.js'

function setup(context, years = [2016, 2018, 2020], options) {
  context.mock.timers.enable({ apis: ['setInterval'] })
  const store = createStore({
    regions: [{ adcode: '330100', level: 'city' }],
    indicators: [{ indicator: 'pop_resident' }],
    stats: years.map((year) => ({ year, indicator: 'pop_resident', adcode: '330100', value: year })),
  })
  const player = createPlayer(store, options)
  context.after(() => player.destroy())
  return { store, player, tick: (ms) => context.mock.timers.tick(ms) }
}

test('playback starts at the beginning from the last year, uses actual years, and stops at the end', (context) => {
  const { store, player, tick } = setup(context)
  assert.equal(player.getState().status, 'paused')
  player.play()
  assert.equal(store.getState().year, 2016)
  tick(999)
  assert.equal(store.getState().year, 2016)
  tick(1)
  assert.equal(store.getState().year, 2018)
  tick(1000)
  assert.equal(store.getState().year, 2020)
  assert.equal(player.getState().status, 'paused')
  tick(5000)
  assert.equal(store.getState().year, 2020)
})

test('repeated play never duplicates the timer; pause and resume preserve the selected year', (context) => {
  const { store, player, tick } = setup(context)
  player.play()
  player.play()
  tick(1000)
  assert.equal(store.getState().year, 2018)
  player.pause()
  tick(5000)
  assert.equal(store.getState().year, 2018)
  player.toggle()
  tick(1000)
  assert.equal(store.getState().year, 2020)
  assert.equal(player.getState().status, 'paused')
})

test('looping retains the final year for a full interval before wrapping', (context) => {
  const { store, player, tick } = setup(context, undefined, { loop: true })
  player.play()
  tick(2000)
  assert.equal(store.getState().year, 2020)
  assert.equal(player.getState().status, 'playing')
  tick(1000)
  assert.equal(store.getState().year, 2016)
  player.setLoop(false)
  tick(2000)
  assert.equal(store.getState().year, 2020)
  assert.equal(player.getState().status, 'paused')
})

test('changing playback speed replaces the active timer and validates intervals', (context) => {
  const { store, player, tick } = setup(context)
  player.play()
  tick(500)
  player.setIntervalMs(2000)
  tick(1500)
  assert.equal(store.getState().year, 2016)
  tick(500)
  assert.equal(store.getState().year, 2018)
  for (const value of [0, -1, NaN, Infinity]) assert.throws(() => player.setIntervalMs(value), /正数/)
})

test('turning looping off at the last year pauses immediately', (context) => {
  const { store, player, tick } = setup(context, undefined, { loop: true })
  player.play()
  tick(2000)
  player.setLoop(false)
  tick(2000)
  assert.equal(store.getState().year, 2020)
  assert.equal(player.getState().status, 'paused')
})

test('manual year selection after pausing stays fixed; destroy clears timers and subscriptions', (context) => {
  const { store, player, tick } = setup(context)
  const events = []
  const unsubscribe = player.subscribe((state) => events.push(state.status))
  player.play()
  player.pause()
  store.setState({ year: 2018 })
  tick(5000)
  assert.equal(store.getState().year, 2018)
  assert.deepEqual(events, ['playing', 'paused'])
  unsubscribe()
  player.play()
  player.destroy()
  tick(5000)
  assert.equal(store.getState().year, 2018)
  player.play()
  assert.equal(player.getState().status, 'paused')
  assert.deepEqual(events, ['playing', 'paused'])
})

test('a single available year cannot enter playback', (context) => {
  const { store, player, tick } = setup(context, [2025])
  player.play()
  tick(5000)
  assert.equal(store.getState().year, 2025)
  assert.equal(player.getState().status, 'paused')
})
