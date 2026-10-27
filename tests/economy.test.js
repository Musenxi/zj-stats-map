import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { init } from 'echarts/core'
import '../src/charts/explore.js'
import { parseData } from '../src/data/loader.js'
import { createStore } from '../src/data/store.js'
import { formatValue } from '../src/data/indicators.js'
import { createClassifications } from '../src/map/breaks.js'
import { createTimelineChartSource } from '../src/charts/snapshot.js'
import { createExploreOption } from '../src/charts/exploreOptions.js'

const [regionsText, indicatorsText, statsText, geoText] = await Promise.all(
  ['regions.csv', 'indicators.csv', 'stats.csv', 'geo/zhejiang_city.json']
    .map((path) => readFile(new URL(`../public/data/${path}`, import.meta.url), 'utf8')),
)
const data = parseData({ regionsText, indicatorsText, statsText, geojson: JSON.parse(geoText) })

for (const indicator of ['gdp', 'gdp_per_capita']) {
  test(`${indicator}: all city-years use submitted values in map, rank, trend and tooltips`, () => {
    const store = createStore(data)
    store.setState({ indicator })
    const classification = createClassifications(store).get(indicator)
    const fixedBreaks = [...classification.breaks]
    const rank = createTimelineChartSource(store, 'rank')
    const trend = createTimelineChartSource(store, 'line')
    const metadata = store.indicators.get(indicator)
    for (const year of store.years) {
      store.setState({ year })
      const bars = createExploreOption(rank, 'rank')
      const lines = createExploreOption(trend, 'line')
      assert.equal(bars.series[0].data.length, 11)
      assert.equal(lines.series.length, 11)
      assert.equal(lines.yAxis.name, indicator === 'gdp' ? '亿元' : '元/人')
      assert.equal(lines.series[0].markLine.data[0].xAxis, String(year))
      for (const row of data.stats.filter((row) => row.indicator === indicator && row.year === year)) {
        assert.ok(classification.classify(row.value) >= 0)
        const bar = bars.series[0].data.find((bar) => bar.adcode === row.adcode)
        assert.equal(bar.value, row.value)
        assert.ok(bars.tooltip.formatter({ data: bar }).includes(`${formatValue(row.value, metadata)} ${metadata.unit}`))
        const line = lines.series.find((series) => series.id === row.adcode)
        assert.equal(line.data.find(([pointYear]) => pointYear === String(year))[1], row.value)
      }
      assert.deepEqual(classification.breaks, fixedBreaks)
    }
  })

  test(`${indicator}: independent windows follow years while preserving metric and city scope`, () => {
    const store = createStore(data)
    store.setState({ indicator, selectedCities: ['330100', '330200'] })
    const source = createTimelineChartSource(store, 'rank')
    const changes = []
    const unsubscribe = source.subscribe((state) => changes.push(state))
    store.setState({ indicator: 'pop_density', selectedCities: ['330300'] })
    assert.equal(changes.length, 0)
    store.setState({ year: 2016 })
    assert.deepEqual(changes[0], { indicator, year: 2016, selectedCities: ['330100', '330200'] })
    unsubscribe()
    store.setState({ year: 2020 })
    assert.equal(changes.length, 1)
  })

  test(`${indicator}: rank and trend render at desktop and narrow window sizes`, () => {
    const store = createStore(data)
    store.setState({ indicator })
    for (const type of ['rank', 'line']) {
      for (const width of [300, 540]) {
        const chart = init(null, null, { renderer: 'svg', ssr: true, width, height: 330 })
        try {
          chart.setOption(createExploreOption(createTimelineChartSource(store, type), type))
          const svg = chart.renderToSVGString()
          assert.match(svg, /<svg/)
          assert.match(svg, /杭州/)
          assert.match(svg, /宁波/)
          // Check rendered text bounds, not just the presence of labels in the SVG.
          for (const element of chart.getZr().storage.getDisplayList()) {
            if (element.type !== 'tspan' || !/\d/.test(element.style.text)) continue
            const rect = element.getBoundingRect().clone()
            if (element.transform) rect.applyTransform(element.transform)
            assert.ok(rect.x >= -1 && rect.x + rect.width <= width + 1,
              `${type} ${width}px clipped label: ${element.style.text}`)
          }
        } finally { chart.dispose() }
      }
    }
  })
}

test('missing economy observations stay absent in ranking and null in trends; real zero is retained', () => {
  const stats = data.stats.filter((row) => !(row.indicator === 'gdp' && row.adcode === '330100' && row.year === 2025))
    .map((row) => row.indicator === 'gdp' && row.adcode === '330200' && row.year === 2025 ? { ...row, value: 0 } : row)
  const store = createStore({ ...data, stats })
  store.setState({ indicator: 'gdp', selectedCities: ['330100', '330200'] })
  const bars = createExploreOption(createTimelineChartSource(store, 'rank'), 'rank')
  assert.deepEqual(bars.series[0].data.map(({ adcode, value }) => [adcode, value]), [['330200', 0]])
  const lines = createExploreOption(createTimelineChartSource(store, 'line'), 'line')
  assert.equal(lines.series[0].data.at(-1)[1], null)
  assert.equal(lines.series[0].connectNulls, false)
  assert.equal(lines.series[1].data.at(-1)[1], 0)
})
