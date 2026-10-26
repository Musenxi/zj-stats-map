import { formatValue } from '../data/indicators.js'
import { CITY_COLORS } from './colors.js'

const SECTORS = ['primary', 'secondary', 'tertiary']
const SECTOR_NAMES = ['第一产业', '第二产业', '第三产业']
const SECTOR_COLORS = ['#267768', '#4169b1', '#bd7135']
const SYMBOLS = ['circle', 'rect', 'triangle', 'diamond', 'pin']

/** Read complete sector triplets only. Missing sectors must never look like zero. */
export function createIndustryOption(snapshot, type) {
  const { year, selectedCities } = snapshot.getState()
  const isRadar = type === 'radar'
  const indicators = SECTORS.map((sector) => `${isRadar ? 'share' : 'gdp'}_${sector}`)
  const metadata = indicators.map((indicator) => snapshot.indicators.get(indicator))
  const unit = isRadar ? '%' : '亿元'
  const cities = [...snapshot.regions.values()].filter((region) => region.level === 'city')
  const rows = selectedCities.map((adcode) => ({
    adcode,
    name: snapshot.regions.get(adcode).short_name,
    value: indicators.map((indicator) => snapshot.getValue(indicator, year, adcode)),
    colorIndex: cities.findIndex((city) => city.adcode === adcode),
  })).filter((row) => metadata.every(Boolean) && row.value.every((value) =>
    Number.isFinite(value) && value >= 0 && (!isRadar || value <= 100)))
  const missingCount = selectedCities.length - rows.length
  const base = {
    animation: false,
    textStyle: { fontFamily: '"Microsoft YaHei", sans-serif', color: '#526e65' },
    aria: { enabled: true, label: { description: `${year} 年三次产业${isRadar ? '占比' : '增加值'}，单位${unit}。${missingCount ? `${missingCount} 市缺少完整三项数据，未展示。` : ''}` } },
    legend: { type: 'scroll', bottom: 4, left: 12, right: 12, selectedMode: isRadar,
      itemWidth: 12, itemHeight: 9 },
    tooltip: { trigger: 'item', renderMode: 'richText', confine: true,
      formatter({ data }) {
        const row = rows.find((candidate) => candidate.adcode === data.adcode)
        return [`${year} 年 ${row.name}`, ...row.value.map((value, index) =>
          `${SECTOR_NAMES[index]}：${formatValue(value, metadata[index])} ${unit}`)].join('\n')
      } },
  }
  if (!rows.length) return {
    ...base,
    title: { text: '当前范围无完整产业数据', left: 'center', top: 'middle',
      textStyle: { fontSize: 14, color: '#526e65', fontWeight: 'normal' } },
    series: [],
  }
  if (missingCount) base.title = {
    text: `${missingCount} 市缺少完整三项数据，未展示`, left: 'center', top: 0,
    textStyle: { fontSize: 12, color: '#526e65', fontWeight: 'normal' },
  }
  if (isRadar) return {
    ...base,
    radar: {
      indicator: SECTOR_NAMES.map((name) => ({ name: `${name}\n（%）`, min: 0, max: 100 })),
      center: ['50%', '46%'], radius: '57%', splitNumber: 4,
      axisName: { color: '#526e65', fontSize: 12, lineHeight: 17 },
      splitArea: { areaStyle: { color: ['#fff', '#f5f8f7'] } },
      splitLine: { lineStyle: { color: '#dce7e3' } },
      axisLine: { lineStyle: { color: '#c5d6ce' } },
    },
    series: rows.map((row) => ({
      id: row.adcode, name: row.name, type: 'radar',
      symbol: SYMBOLS[row.colorIndex % SYMBOLS.length], symbolSize: 6,
      itemStyle: { color: CITY_COLORS[row.colorIndex % CITY_COLORS.length] },
      lineStyle: { width: 2, type: row.colorIndex % 2 ? 'dashed' : 'solid' },
      emphasis: { focus: 'series', areaStyle: { opacity: 0.12 } },
      data: [{ name: row.name, adcode: row.adcode, value: row.value }],
    })),
  }
  return {
    ...base,
    grid: { left: 48, right: 28, top: missingCount ? 52 : 32, bottom: 66 },
    xAxis: { type: 'value', name: unit, nameLocation: 'middle', nameGap: 30,
      axisLabel: { hideOverlap: true, fontSize: 11 }, splitLine: { lineStyle: { color: '#eaf0ef' } } },
    yAxis: { type: 'category', inverse: true, data: rows.map((row) => row.name),
      axisTick: { show: false }, axisLine: { show: false }, axisLabel: { interval: 0 } },
    series: SECTOR_NAMES.map((name, index) => ({
      id: indicators[index], name, type: 'bar', stack: 'industry', barMaxWidth: 22,
      itemStyle: { color: SECTOR_COLORS[index] }, emphasis: { focus: 'series' },
      data: rows.map((row) => ({ name: row.name, adcode: row.adcode, value: row.value[index] })),
    })),
  }
}
