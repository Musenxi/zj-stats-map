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

/** Keep each chart's metric while following the shared timeline and city selection. */
export function createTimelineChartSource(store, type) {
  const snapshot = createChartSnapshot(store, type)
  const allCities = Object.freeze([...store.regions.values()]
    .filter((region) => region.level === 'city').map((region) => region.adcode))
  const getState = () => {
    const { year, selectedCities } = store.getState()
    return Object.freeze({
      ...snapshot.getState(), year,
      selectedCities: selectedCities.length ? selectedCities : allCities,
    })
  }
  return {
    ...snapshot,
    getState,
    subscribe(listener) {
      let previous = store.getState()
      return store.subscribe((state) => {
        const changed = state.year !== previous.year ||
          state.selectedCities.join() !== previous.selectedCities.join()
        previous = state
        if (!changed) return
        listener(getState())
      })
    },
  }
}
