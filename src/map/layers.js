import Map from 'ol/Map.js'
import View from 'ol/View.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import { createCityStyle } from './style.js'

export function toggleCity(store, adcode) {
  const { selectedCities } = store.getState()
  store.setState({
    selectedCities: selectedCities.includes(adcode)
      ? selectedCities.filter((code) => code !== adcode)
      : [...selectedCities, adcode],
  })
}

export function createCityMap({ target, store, classifications }) {
  const source = new VectorSource({
    features: new GeoJSON().readFeatures(store.geojson, {
      dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857',
    }),
  })
  const layer = new VectorLayer({ source, style: createCityStyle(store, classifications) })
  const map = new Map({
    target, layers: [layer],
    view: new View({ center: [0, 0], zoom: 7, minZoom: 6, maxZoom: 13 }),
  })
  const resetView = () => map.getView().fit(source.getExtent(), {
    padding: [36, 36, 36, 36], size: map.getSize(), maxZoom: 9,
  })
  resetView()
  const findCity = (pixel) => map.forEachFeatureAtPixel(pixel, (feature) => feature, {
    layerFilter: (candidate) => candidate === layer, hitTolerance: 3,
  })
  map.on('singleclick', (event) => {
    const feature = findCity(event.pixel)
    if (feature) toggleCity(store, feature.get('adcode'))
  })
  map.on('pointermove', (event) => {
    if (!event.dragging) target.style.cursor = findCity(event.pixel) ? 'pointer' : ''
  })
  const unsubscribe = store.subscribe(() => layer.changed())
  const observer = new ResizeObserver(() => map.updateSize())
  observer.observe(target)
  return {
    resetView,
    destroy() {
      unsubscribe()
      observer.disconnect()
      map.setTarget(undefined)
      map.dispose()
    },
  }
}
