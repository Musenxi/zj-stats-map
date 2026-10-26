# 图表模块（M2）

- `line.js`：选中城市的历年序列，支持多城市对比；标记当前年与 2020 年口径调整。
- `rank.js`：可选的当前年城市排行。

使用 `echarts/core` 按需引入图表及组件。通过 `store.getSeries(indicator, adcode)` 获取序列，通过 `store.subscribe()` 同步选择状态；缺失值保持 `null`，不插值。

GDP、产业结构和收入图表暂不实现。
