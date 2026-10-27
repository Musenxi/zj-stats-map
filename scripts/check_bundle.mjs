import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

const dist = new URL('../dist/', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('.vite/manifest.json', dist), 'utf8'))

// Follow static imports only: dynamic imports are separate user-triggered requests.
function dependencies(key, result = new Set()) {
  assert.ok(manifest[key], `Missing build entry: ${key}`)
  if (result.has(key)) return result
  result.add(key)
  for (const dependency of manifest[key].imports ?? []) dependencies(dependency, result)
  return result
}

const chartEntry = 'src/charts/explore.js'
const typeEntries = ['pie', 'bar', 'line', 'radar'].map((type) => `src/charts/types/${type}.js`)
const initial = dependencies('index.html')
for (const key of [chartEntry, ...typeEntries]) {
  assert.ok(!initial.has(key), `Chart code must stay out of initial loading: ${key}`)
}
const shared = dependencies(chartEntry)
for (const key of typeEntries) assert.ok(!shared.has(key), `Chart type loaded eagerly: ${key}`)

async function size(keys) {
  const buffers = await Promise.all([...keys].map((key) => readFile(new URL(manifest[key].file, dist))))
  const raw = buffers.reduce((sum, buffer) => sum + buffer.length, 0)
  const gzip = buffers.reduce((sum, buffer) => sum + gzipSync(buffer).length, 0)
  return `${(raw / 1000).toFixed(2)} kB / gzip ${(gzip / 1000).toFixed(2)} kB`
}

console.log(`Initial JS: ${await size(initial)}`)
for (const entry of typeEntries) {
  const requested = dependencies(entry, new Set(shared))
  for (const other of typeEntries.filter((key) => key !== entry)) {
    assert.ok(!requested.has(other), `${entry} also loads unused type ${other}`)
  }
  for (const key of initial) requested.delete(key)
  console.log(`First ${entry.split('/').at(-1)} chart, additional JS: ${await size(requested)}`)
}
console.log('Bundle loading checks passed')
