import './style.css'
import 'ol/ol.css'
import { loadData } from './data/loader.js'
import { createStore } from './data/store.js'
import { formatValue } from './data/indicators.js'
import { createClassifications } from './map/breaks.js'
import { createCityMap, toggleCity } from './map/layers.js'
import { createIndicatorPicker } from './ui/indicatorPicker.js'
import { createLegend } from './ui/legend.js'

const app = document.querySelector('#app')
app.innerHTML = `
  <main>
    <header><p class="eyebrow">ZHEJIANG · WEBGIS</p><h1>浙江省统计专题地图</h1>
      <p class="subtitle">人口与密度 · 市级统计数据</p></header>
    <section id="status" role="status" aria-live="polite">正在加载统计数据与市级边界…</section>
    <section id="content" hidden>
      <div class="metrics" id="metrics"></div>
      <section class="panel map-panel" aria-labelledby="map-title">
        <div class="panel-heading map-heading">
          <div><h2 id="map-title">市级专题地图</h2><p id="map-subtitle"></p></div>
          <div id="indicator-picker" class="indicator-picker"></div>
        </div>
        <div class="map-layout">
          <div class="map-area">
            <div id="map" tabindex="0" role="region" aria-label="浙江省市级专题地图，可用方向键平移、加减键缩放；也可在下方数据表选择城市"></div>
            <button id="reset-view" class="map-reset" type="button">返回全省</button>
            <p class="map-hint">点击城市可多选，再次点击取消</p>
          </div>
          <aside class="map-sidebar">
            <section id="legend" aria-label="分级设色图例"></section>
            <section class="selection-panel" aria-labelledby="selection-title">
              <div class="selection-heading"><h3 id="selection-title">已选城市</h3>
                <button id="clear-selection" type="button" disabled>清空</button></div>
              <p id="selection-status" class="sr-only" role="status" aria-live="polite"></p>
              <div id="selection"></div>
            </section>
          </aside>
        </div>
      </section>
      <section class="panel">
        <div class="panel-heading"><h2>市级数据概览</h2><span id="year"></span></div>
        <div class="table-scroll"><table>
          <caption class="sr-only">各市当前年份的统计数据，点击城市名称可选择或取消选择</caption>
          <thead><tr><th scope="col">城市</th><th scope="col" data-indicator="pop_resident">常住人口（万人）</th>
            <th scope="col" data-indicator="pop_density">人口密度（人/km²）</th><th scope="col">行政区面积（km²）</th></tr></thead>
          <tbody id="cities"></tbody>
        </table></div>
      </section>
      <aside class="note"><strong>数据口径</strong><p id="data-note"></p>
        <p>人口密度读取预计算值；缺失值显示为“无数据”。</p>
        <p>边界原始来源、许可、坐标参考与区划年份尚待确认。</p></aside>
    </section>
  </main>`

function metric(label, value) {
  const card = document.createElement('div')
  card.className = 'metric'
  const number = document.createElement('strong')
  number.textContent = value
  const caption = document.createElement('span')
  caption.textContent = label
  card.append(number, caption)
  return card
}

const cleanups = []

async function bootstrap() {
  const status = document.querySelector('#status')
  try {
    const store = createStore(await loadData())
    const cities = [...store.regions.values()].filter((region) => region.level === 'city')
    document.querySelector('#metrics').append(
      metric('地级市', cities.length),
      metric('年份范围', `${store.years[0]}–${store.years.at(-1)}`),
      metric('启用指标', store.indicators.size),
      metric('统计记录', store.recordCount),
    )
    const rows = new Map(cities.map((region) => {
      const row = document.createElement('tr')
      const heading = document.createElement('th')
      heading.scope = 'row'
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'city-button'
      button.textContent = region.name
      button.addEventListener('click', () => toggleCity(store, region.adcode))
      heading.append(button)
      row.append(heading, ...Array.from({ length: 3 }, () => document.createElement('td')))
      return [region.adcode, row]
    }))
    document.querySelector('#cities').replaceChildren(...rows.values())
    const render = ({ indicator, year, selectedCities }) => {
      const metadata = store.indicators.get(indicator)
      document.querySelector('#year').textContent = `${year} 年`
      document.querySelector('#map-subtitle').textContent = `${year} 年 · ${metadata.label}（${metadata.unit}）`
      for (const region of cities) {
        const row = rows.get(region.adcode)
        const selected = selectedCities.includes(region.adcode)
        row.classList.toggle('selected', selected)
        row.querySelector('button').setAttribute('aria-pressed', String(selected))
        const values = [
          formatValue(store.getValue('pop_resident', year, region.adcode), store.indicators.get('pop_resident')),
          formatValue(store.getValue('pop_density', year, region.adcode), store.indicators.get('pop_density')),
          formatValue(region.area_land, { decimals: 1 }),
        ]
        row.querySelectorAll('td').forEach((cell, index) => { cell.textContent = values[index] })
      }
      document.querySelectorAll('[data-indicator]').forEach((heading) => {
        heading.classList.toggle('active-indicator', heading.dataset.indicator === indicator)
      })
      const selection = document.querySelector('#selection')
      if (!selectedCities.length) {
        const empty = document.createElement('p')
        empty.className = 'selection-empty'
        empty.textContent = '从地图或下方数据表选择城市，查看当前指标数值。'
        selection.replaceChildren(empty)
      } else {
        selection.replaceChildren(...selectedCities.map((adcode) => {
          const item = document.createElement('p')
          item.className = 'selected-city'
          const name = document.createElement('span')
          name.textContent = store.regions.get(adcode).short_name
          const value = document.createElement('strong')
          const number = store.getValue(indicator, year, adcode)
          value.textContent = number === null ? '无数据' : `${formatValue(number, metadata)} ${metadata.unit}`
          item.append(name, value)
          return item
        }))
      }
      document.querySelector('#clear-selection').disabled = !selectedCities.length
      document.querySelector('#selection-status').textContent = selectedCities.length
        ? `已选择 ${selectedCities.map((adcode) => store.regions.get(adcode).short_name).join('、')}`
        : '尚未选择城市'
    }
    render(store.getState())
    cleanups.push(store.subscribe(render))
    const classifications = createClassifications(store)
    cleanups.push(
      createIndicatorPicker({ target: document.querySelector('#indicator-picker'), store }),
      createLegend({ target: document.querySelector('#legend'), store, classifications }),
    )
    document.querySelector('#data-note').textContent = store.indicators.get('pop_resident').note
    document.querySelector('#content').hidden = false
    const cityMap = createCityMap({ target: document.querySelector('#map'), store, classifications })
    cleanups.push(() => cityMap.destroy())
    const resetButton = document.querySelector('#reset-view')
    const clearButton = document.querySelector('#clear-selection')
    const clearSelection = () => store.setState({ selectedCities: [] })
    resetButton.addEventListener('click', cityMap.resetView)
    clearButton.addEventListener('click', clearSelection)
    cleanups.push(() => {
      resetButton.removeEventListener('click', cityMap.resetView)
      clearButton.removeEventListener('click', clearSelection)
    })
    status.textContent = '统计数据与 11 市地图已就绪'
    status.classList.add('success')
  } catch (error) {
    cleanups.splice(0).reverse().forEach((cleanup) => cleanup())
    document.querySelector('#content').hidden = true
    console.error('数据初始化失败', error)
    status.classList.add('error')
    status.textContent = `地图初始化失败：${error.message}`
    const retry = document.createElement('button')
    retry.type = 'button'
    retry.textContent = '重新加载'
    retry.addEventListener('click', () => window.location.reload())
    status.append(retry)
  }
}

bootstrap()

if (import.meta.hot) {
  import.meta.hot.dispose(() => cleanups.splice(0).reverse().forEach((cleanup) => cleanup()))
}
