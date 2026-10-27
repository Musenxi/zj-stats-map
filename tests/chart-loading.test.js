import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { loadChartType } from '../src/charts/explore.js'

const run = promisify(execFile)

// Each process starts with an empty ECharts registry, so another chart cannot mask a missing dependency.
for (const type of ['pie', 'rank', 'line', 'radar', 'stack']) {
  test(`${type} loads independently and supports concurrent window requests`, async () => {
    const script = `
      import assert from 'node:assert/strict'
      import { readFile } from 'node:fs/promises'
      import { init } from 'echarts/core'
      import { loadChartType } from './src/charts/explore.js'
      import { createExploreOption } from './src/charts/exploreOptions.js'
      import { createTimelineChartSource } from './src/charts/snapshot.js'
      import { createStore } from './src/data/store.js'
      import { parseData } from './src/data/loader.js'
      const type = process.argv[1]
      const [regionsText, indicatorsText, statsText, geoText] = await Promise.all(
        ['regions.csv', 'indicators.csv', 'stats.csv', 'geo/zhejiang_city.json']
          .map(path => readFile('public/data/' + path, 'utf8')))
      const store = createStore(parseData({ regionsText, indicatorsText, statsText, geojson: JSON.parse(geoText) }))
      await Promise.all([loadChartType(type), loadChartType(type)])
      const chart = init(null, null, { renderer: 'svg', ssr: true, width: 540, height: 330 })
      try {
        chart.setOption(createExploreOption(createTimelineChartSource(store, type), type))
        const svg = chart.renderToSVGString()
        assert.match(svg, /<svg/)
        assert.match(svg, /杭州/)
      } finally { chart.dispose() }
    `
    const { stderr } = await run(process.execPath, ['--input-type=module', '-e', script, type], {
      cwd: new URL('../', import.meta.url),
    })
    assert.equal(stderr, '')
  })
}

test('unknown chart types fail explicitly', async () => {
  await assert.rejects(loadChartType('unknown'), /未知图表类型/)
})
