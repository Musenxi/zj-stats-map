# 交互模块（M1–M2）

- `indicatorPicker.js`、`legend.js`：指标切换与固定断点图例（M1）。
- `timeline.js`、`player.js`：动态年份滑块与播放控制（M2）。

年份来自 `store.years`，控件通过 `store.setState()` 更新共享状态。播放默认间隔 1000 ms、末年停止；手动拖动时暂停。组件销毁时取消订阅和计时器。
