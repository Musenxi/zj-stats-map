/** Capture controls without changing global state or subscribing the chart to it. */
export function createChartSnapshot(store, type) {
  const current = store.getState()
  const selectedCities = current.selectedCities.length
    ? [...current.selectedCities]
    : [...store.regions.values()].filter((region) => region.level === 'city').map((region) => region.adcode)
  const state = Object.freeze({
    ...current,
    // Density is not additive. The composition chart always uses population.
    indicator: type === 'pie' ? 'pop_resident' : current.indicator,
    selectedCities: Object.freeze(selectedCities),
  })
  return { ...store, getState: () => state }
}
