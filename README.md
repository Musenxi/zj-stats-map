# 浙江省统计专题地图 WebGIS

基于 Vite + 原生 JavaScript + OpenLayers + ECharts 的静态 WebGIS，无后端
行政区划仅含浙江省及 11 个地级市，当前数据为 2016–2025 年常住人口和预计算人口密度

## 开发环境

- Node.js 20.19+（20 系列）或 22.12+，建议使用 Node.js 24 LTS
- npm
- Python 3.10+，校验脚本仅使用标准库，无需安装 Python 依赖

```bash
npm ci
npm run data:check
npm run dev
```

访问终端输出的本地地址。首页加载四份静态数据，展示最近年份的 11 市专题地图和数据表；加载失败时显示原因并提供重试

可切换常住人口与人口密度。地图与图例按每个指标的 2016–2025 年全部数据使用五级分位数固定断点，重复断点合并，断点值归入较低一级；缺失值显示灰色。点击地图城市或数据表中的城市名称可多选、取消选择，侧栏显示所选城市当前指标值；“清空”取消全部选择，“返回全省”恢复地图范围。地图也支持键盘平移与缩放，城市选择可通过表格按钮使用键盘操作

## 常用命令

| 命令                 | 用途                                                     |
| -------------------- | -------------------------------------------------------- |
| `npm run dev`        | 启动 Vite 开发服务器                                     |
| `npm run data:check` | 只校验现有 `stats.csv`，不改写数据                       |
| `npm run data:merge` | 合并 `public/data/raw/*.csv`，校验通过后写入 `stats.csv` |
| `npm test`           | 运行数据加载、Store、地图分级/样式与校验脚本测试          |
| `npm run build`      | 先校验数据，再构建到 `dist/`；校验失败则停止             |
| `npm run preview`    | 本地预览构建产物                                         |

需要选择输入文件时：

```bash
python scripts/merge_stats.py --input public/data/raw/stats_task1.csv
```

## 目录与接口

```text
public/data/
  geo/zhejiang_city.json  # 规范化市级边界，adcode 为字符串
  regions.csv            # 1 省 + 11 市，含面积与中心点
  indicators.csv         # 当前仅任务 1 两项指标
  stats.csv              # 长表；当前 220 条记录
  raw/stats_task1.csv     # 原始提交，合并脚本的输入
scripts/merge_stats.py    # CSV 合并、校验与覆盖率报告
src/
  data/loader.js         # 并行加载、CSV 解析与编码关联
  data/store.js          # 内存索引与共享选择状态
  data/indicators.js     # 指标常量与数值格式化
  map/                   # 市级图层、跨年份固定断点与选择样式
  charts/                # M2 图表模块约定
  ui/                    # 指标选择与图例；时间轴/播放待 M2
  main.js                # 地图、控件与数据表入口
tests/                   # Node.js 与 Python 标准库测试
```

`loadData()` 使用 Vite 的 `BASE_URL` 加载资源，返回解析后的数据。编码始终保留为字符串，数值和年份显式转换；人口密度直接读取，不在前端计算

```js
const store = createStore(await loadData());
store.getValue('pop_resident', 2016, '330100'); // 918.8；缺失时返回 null
store.getSeries('pop_resident', '330100'); // [[2016, 918.8], ...]
const unsubscribe = store.subscribe((state) => {
    /* 更新地图、图表、控件 */
});
store.setState({ year: 2020, selectedCities: ['330100'] });
unsubscribe();
```

索引结构为 `Map<indicator, Map<year, Map<adcode, number>>>`。共享状态包含 `indicator`、`year` 和 `selectedCities`；默认选择首个指标和最新年份，不预选城市。支持多城市选择，拒绝省级与未登记地区

## 数据校验与口径

脚本检查列名与顺序、六位字符串编码、地区及边界关联、重复主键、有限数值、指标登记和人口密度公式。密度允许误差 ≤ 0.1 人/km²，校验失败不会覆盖输出文件。覆盖率按登记城市、当前数据年份和启用指标计算，缺失行只报告、不补零

- 当前覆盖率：11 市 × 10 年 × 2 指标 = 220 行
- 2020 年起涉及人口普查口径调整；2025 年暂按“初步数据”展示
- 省级不提供统计值，面积是地区表的静态属性
- 规范化边界来自仓库已有的 `public/data/geo/浙江省.geojson`，仅将要素 `adcode` 转为字符串，未改动几何；原文件保留。原始来源、许可、坐标参考与区划年份尚未确认，不将初始化日期当作区划版本

## 开发阶段

依据 [设计文档 v0.2](docs/webgis_design_v0.2.md)，已完成 **M0 初始化**与 **M1 市级专题地图**：数据加载与校验、OpenLayers 市级边界、跨年份固定分级设色、图例、指标切换和城市多选高亮

- M1 已实现：仅初始化时解析并投影 GeoJSON（EPSG:4326 → EPSG:3857），状态更新调用 `layer.changed()`，不重复加载边界；图例与地图共用断点。当前仅绘制本地市级边界，无外部底图服务
- M2 待实现：年份滑块、播放控制、按需引入 ECharts 的折线图和地图联动；排行图可选
- M3–M5 暂不开发：GDP、产业结构、收入。县区下钻不在范围内
