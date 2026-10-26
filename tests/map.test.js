import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import GeoJSON from 'ol/format/GeoJSON.js'
import { createClassification, createClassifications } from '../src/map/breaks.js'
import { createCityStyle, NO_DATA_COLOR } from '../src/map/style.js'
import { toggleCity } from '../src/map/layers.js'
import { parseData } from '../src/data/loader.js'
import { createStore } from '../src/data/store.js'

const [regionsText, indicatorsText, statsText, geoText] = await Promise.all(
  ['regions.csv', 'indicators.csv', 'stats.csv', 'geo/zhejiang_city.json']
    .map((path) => readFile(new URL(`../public/data/${path}`, import.meta.url), 'utf8')),
)
const fixture = parseData({ regionsText, indicatorsText, statsText, geojson: JSON.parse(geoText) })

test('quantile thresholds use observed values with inclusive upper bounds', () => {
  const classification = createClassification([10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
  assert.deepEqual(classification.breaks, [2, 4, 6, 8])
  assert.deepEqual([1, 2, 2.1, 4, 4.1, 8, 9, 10].map(classification.classify), [0, 0, 1, 1, 2, 3, 4, 4])
  assert.equal(classification.colors.length, 5)
})

test('ties, constant data, empty data, zero, and missing values remain valid', () => {
  const ties = createClassification([0, 0, 0, 1, 1])
  assert.deepEqual(ties.breaks, [0])
  assert.equal(ties.classify(0), 0)
  assert.equal(ties.classify(1), 1)
  const constant = createClassification([7, 7, 7])
  assert.deepEqual(constant.breaks, [])
  assert.equal(constant.colors.length, 1)
  assert.equal(constant.classify(7), 0)
  const empty = createClassification([null, undefined, NaN, Infinity, '1'])
  assert.deepEqual(empty.colors, [])
  assert.equal(empty.classify(0), -1)
  for (const value of [null, undefined, NaN, Infinity]) assert.equal(ties.classify(value), -1)
  for (const count of [0, 6, 1.5]) assert.throws(() => createClassification([1], count))
})

test('classifications include every year and remain fixed when shared state changes', () => {
  const store = createStore(fixture)
  const classifications = createClassifications(store)
  const initial = structuredClone([...classifications].map(([key, value]) => [key, value.breaks]))
  for (const [indicator, classification] of classifications) {
    const values = fixture.stats.filter((row) => row.indicator === indicator).map((row) => row.value)
    assert.equal(classification.min, Math.min(...values))
    assert.equal(classification.max, Math.max(...values))
    for (const year of store.years) {
      store.setState({ year, indicator })
      assert.deepEqual(classifications.get(indicator).breaks, createClassifications(store).get(indicator).breaks)
      for (const region of fixture.regions.filter((region) => region.level === 'city')) {
        assert.ok(classification.classify(store.getValue(indicator, year, region.adcode)) >= 0)
      }
    }
  }
  assert.deepEqual([...classifications].map(([key, value]) => [key, value.breaks]), initial)
})

test('real boundaries use the matching color, selection outline, city label, and missing-data fill', () => {
  const data = { ...fixture, stats: fixture.stats.filter((row) =>
    !(row.adcode === '330100' && row.year === 2016 && row.indicator === 'pop_resident')) }
  const store = createStore(data)
  const classifications = createClassifications(store)
  const style = createCityStyle(store, classifications)
  const features = new GeoJSON().readFeatures(store.geojson, { featureProjection: 'EPSG:3857' })
  const city = features.find((feature) => feature.get('adcode') === '330100')
  for (const feature of features) {
    assert.ok(style(feature)[1].getGeometry().getCoordinates().every(Number.isFinite))
  }
  const [normal, label] = style(city)
  const population = classifications.get('pop_resident')
  assert.equal(normal.getFill().getColor(), population.colors[population.classify(store.getValue('pop_resident', 2025, '330100'))])
  assert.equal(label.getText().getText(), '杭州')
  toggleCity(store, '330100')
  assert.equal(style(city)[0].getStroke().getWidth(), 3)
  store.setState({ indicator: 'pop_density' })
  const density = classifications.get('pop_density')
  assert.equal(style(city)[0].getFill().getColor(), density.colors[density.classify(store.getValue('pop_density', 2025, '330100'))])
  store.setState({ indicator: 'pop_resident', year: 2016 })
  assert.equal(style(city)[0].getFill().getColor(), NO_DATA_COLOR)
  assert.equal(style(city)[0].getStroke().getWidth(), 3)
})

test('city toggling supports multiple selections and deselection without changing indicator or year', () => {
  const store = createStore(fixture)
  toggleCity(store, '330100')
  toggleCity(store, '330200')
  assert.deepEqual(store.getState().selectedCities, ['330100', '330200'])
  toggleCity(store, '330100')
  assert.deepEqual(store.getState(), { indicator: 'pop_resident', year: 2025, selectedCities: ['330200'] })
})
