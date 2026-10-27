import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, MarkLineComponent } from 'echarts/components'

export function register() {
  use([LineChart, GridComponent, MarkLineComponent])
}
