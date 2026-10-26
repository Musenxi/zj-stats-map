export function createIndicatorPicker({ target, store }) {
  const label = document.createElement('label')
  label.htmlFor = 'indicator-select'
  label.textContent = '统计指标'
  const select = document.createElement('select')
  select.id = 'indicator-select'
  for (const metadata of store.indicators.values()) {
    const option = document.createElement('option')
    option.value = metadata.indicator
    option.textContent = `${metadata.label}（${metadata.unit}）`
    select.append(option)
  }
  const change = () => store.setState({ indicator: select.value })
  select.addEventListener('change', change)
  const render = ({ indicator }) => { select.value = indicator }
  render(store.getState())
  const unsubscribe = store.subscribe(render)
  target.replaceChildren(label, select)
  return () => {
    unsubscribe()
    select.removeEventListener('change', change)
    target.replaceChildren()
  }
}
