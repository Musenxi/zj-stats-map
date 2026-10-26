# 交互模块（M1–M2）

- `indicatorPicker.js`、`legend.js`：指标切换与固定断点图例（M1）。
- `timeline.js`、`player.js`：动态年份滑块与播放控制（M2）。

M1 的 `createIndicatorPicker({ target, store })` 与 `createLegend({ target, store, classifications })` 已实现，均返回销毁函数，取消订阅并清理控件。图例明确显示每档上下界和单位，独立列出“无数据”。

M2 已实现：`createPlayer(store, { intervalMs = 1000, loop = false })` 返回 `play/pause/toggle/setIntervalMs/setLoop/getState/subscribe/destroy`。播放状态独立于 Store，年份写入 Store。末年启动时重播，默认抵达末年立即暂停；循环时在末年停留一个间隔再回首年。速度变更替换计时器，单年份不启动播放。

`createTimeline({ target, store, player })` 返回销毁函数。滑块按实际年份索引取值，支持非连续年份；提供上一年/下一年、播放/暂停、0.5/1/2 秒间隔和循环控制。滑块 pointerdown/input 均暂停播放，2025 年显示初步数据标记。

年份来自 `store.years`，控件通过 `store.setState()` 更新共享状态。播放默认间隔 1000 ms、末年停止；手动拖动时暂停。组件销毁时取消订阅和计时器。
