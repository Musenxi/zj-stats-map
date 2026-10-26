# 图表模块（M2）

- `line.js`：选中城市的历年序列，支持多城市对比；标记当前年与 2020 年口径调整。
- `lineOptions.js`：纯配置构建函数，生成序列、单位、工具提示、城市固定颜色与标注，供运行时及测试共用。
- `rank.js`：可选的当前年城市排行。

使用 `echarts/core` 按需引入图表及组件。通过 `store.getSeries(indicator, adcode)` 获取序列，通过 `store.subscribe()` 同步选择状态；缺失值保持 `null`，不插值。

M2 折线图已实现，`rank.js` 暂未实现。入口动态导入 `line.js`，注册 LineChart、Grid/Legend/Tooltip/MarkLine/MarkArea/Aria 和 SVGRenderer。`createLineChart({ target, store, onSelectYear })` 返回销毁函数；点击折线数据点触发 `onSelectYear(year)`，由入口暂停播放并更新共享年份。无城市选择时隐藏图表，入口显示选择提示。图表加载失败仅影响趋势面板。

当前年份使用虚线，2019–2020 年区间标注口径调整，2025 年初步数据在面板说明与工具提示中展示。ResizeObserver 同步容器尺寸，销毁时取消订阅、观察器并释放图表实例。

GDP、产业结构和收入图表暂不实现。
