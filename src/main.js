import './style.css'
import { loadData } from './data/loader.js'
import { createStore } from './data/store.js'
import { formatValue } from './data/indicators.js'

const app = document.querySelector('#app')
app.innerHTML = `
  <main>
    <header><p class="eyebrow">ZHEJIANG · WEBGIS</p><h1>浙江省统计专题地图</h1>
      <p class="subtitle">人口与密度 · 市级统计数据</p></header>
    <section id="status" role="status" aria-live="polite">正在加载统计数据与市级边界…</section>
    <section id="content" hidden>
      <div class="metrics" id="metrics"></div>
      <section class="panel">
        <div class="panel-heading"><h2>市级数据概览</h2><span id="year"></span></div>
        <div class="table-scroll"><table>
          <caption class="sr-only">各市最近年份的常住人口、人口密度与行政区面积</caption>
          <thead><tr><th scope="col">城市</th><th scope="col">常住人口（万人）</th>
            <th scope="col">人口密度（人/km²）</th><th scope="col">行政区面积（km²）</th></tr></thead>
          <tbody id="cities"></tbody>
        </table></div>
      </section>
      <aside class="note"><strong>数据口径</strong><p id="data-note"></p>
        <p>人口密度读取预计算值；缺失值显示为“无数据”。</p></aside>
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

async function bootstrap() {
  const status = document.querySelector('#status')
  try {
    const store = createStore(await loadData())
    const { year } = store.getState()
    const cities = [...store.regions.values()].filter((region) => region.level === 'city')
    document.querySelector('#metrics').append(
      metric('地级市', cities.length),
      metric('年份范围', `${store.years[0]}–${store.years.at(-1)}`),
      metric('启用指标', store.indicators.size),
      metric('统计记录', store.recordCount),
    )
    document.querySelector('#year').textContent = `${year} 年`
    const rows = cities.map((region) => {
      const row = document.createElement('tr')
      const values = [
        region.name,
        formatValue(store.getValue('pop_resident', year, region.adcode), store.indicators.get('pop_resident')),
        formatValue(store.getValue('pop_density', year, region.adcode), store.indicators.get('pop_density')),
        formatValue(region.area_land, { decimals: 1 }),
      ]
      values.forEach((value, index) => {
        const cell = document.createElement(index === 0 ? 'th' : 'td')
        if (index === 0) cell.scope = 'row'
        cell.textContent = value
        row.append(cell)
      })
      return row
    })
    document.querySelector('#cities').replaceChildren(...rows)
    document.querySelector('#data-note').textContent = store.indicators.get('pop_resident').note
    status.textContent = '统计数据与 11 市边界已就绪'
    status.classList.add('success')
    document.querySelector('#content').hidden = false
  } catch (error) {
    console.error('数据初始化失败', error)
    status.classList.add('error')
    status.textContent = `数据加载失败：${error.message}`
    const retry = document.createElement('button')
    retry.type = 'button'
    retry.textContent = '重新加载'
    retry.addEventListener('click', () => window.location.reload())
    status.append(retry)
  }
}

bootstrap()
