# 地图模块（M1）

- `layers.js`：OpenLayers 市级面图层。使用 Store 中的 GeoJSON，仅初始化时读取一次。
- `breaks.js`：按指标在所有年份的数据计算固定分级断点。
- `style.js`：分级设色、无数据灰色样式与选中城市高亮。

从 Store 读取 `indicator`、`year`、`selectedCities`。状态更新时调用 `layer.changed()`，不重新获取边界；点击要素时调用 `store.setState({ selectedCities })`。仅市级，不做县区下钻。
