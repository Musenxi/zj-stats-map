import { formatValue } from '../data/indicators.js'
import { NO_DATA_COLOR } from '../map/style.js'

export function createLegend({ target, store, classifications }) {
  let previousIndicator
  const render = ({ indicator }) => {
    if (indicator === previousIndicator) return
    previousIndicator = indicator
    const metadata = store.indicators.get(indicator)
    const { breaks, colors } = classifications.get(indicator)
    const heading = document.createElement('h3')
    heading.textContent = `${metadata.label}（${metadata.unit}）`
    const list = document.createElement('ul')
    list.className = 'legend-list'
    const labels = colors.map((_, index) => {
      if (!breaks.length) return '全部有效值'
      if (index === 0) return `≤ ${formatValue(breaks[0], metadata)}`
      if (index === breaks.length) return `> ${formatValue(breaks.at(-1), metadata)}`
      return `> ${formatValue(breaks[index - 1], metadata)} 且 ≤ ${formatValue(breaks[index], metadata)}`
    })
    for (const [index, label] of [...labels, '无数据'].entries()) {
      const item = document.createElement('li')
      const swatch = document.createElement('span')
      swatch.className = 'legend-swatch'
      swatch.style.backgroundColor = colors[index] ?? NO_DATA_COLOR
      swatch.setAttribute('aria-hidden', 'true')
      item.append(swatch, document.createTextNode(label))
      list.append(item)
    }
    const note = document.createElement('p')
    note.className = 'legend-note'
    note.textContent = `按 ${store.years[0]} 至 ${store.years.at(-1)} 年全部数据的分位数固定分级；各年份共用断点。`
    target.replaceChildren(heading, list, note)
  }
  render(store.getState())
  const unsubscribe = store.subscribe(render)
  return () => { unsubscribe(); target.replaceChildren() }
}
