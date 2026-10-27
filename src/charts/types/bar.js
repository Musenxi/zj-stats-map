import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'

export function register() {
  use([BarChart, GridComponent])
}
