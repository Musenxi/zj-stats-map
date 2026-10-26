/** Capture controls without changing global state or subscribing the chart to it. */
export function createChartSnapshot(store, type) {
  const current = store.getState()
  const selectedCities = current.selectedCities.length
    ? [...current.selectedCities]
    : [...store.regions.values()].filter((region) => region.level === 'city').map((region) => region.adcode)
  const state = Object.freeze({
    ...current,
    // Density is not additive. The composition chart always uses population.
    indicator: ({ pie: 'pop_resident', radar: 'share_primary', stack: 'gdp_primary' })[type] ?? current.indicator,
    selectedCities: Object.freeze(selectedCities),
  })
  return { ...store, getState: () => state }
}

/** Keep each chart's metric and city scope while following the shared timeline. */
export function createTimelineChartSource(store, type) {
  const snapshot = createChartSnapshot(store, type)
  const getState = () => Object.freeze({ ...snapshot.getState(), year: store.getState().year })
  return {
    ...snapshot,
    getState,
    subscribe(listener) {
      let year = store.getState().year
      return store.subscribe((state) => {
        if (state.year === year) return
        year = state.year
        listener(getState())
      })
    },
  }
}
