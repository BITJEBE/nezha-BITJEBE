# nezha-BITJEBE

基于 [nezha-dash-v1](https://github.com/Akizon77/nezha-dash-v1) 二次开发的 [Komari Monitor](https://github.com/komari-monitor/komari) 自定义主题。

## 功能特性

### 流量进度条
- 服务器卡片内置流量使用进度条（无需外部脚本）
- 支持所有流量计算模式：`sum`（双向）、`max`、`min`、`up`、`down`
- 基于使用百分比的 HSL 渐变色（绿 -> 黄 -> 红）
- 轮播显示：使用百分比、重置倒计时、计费类型
- 通过服务器 ID 精确匹配（避免重名导致的匹配问题）

### 增强标签系统
- 支持以 `;` 分隔多个标签（匹配 Komari 后端格式）
- 颜色标签：在标签后追加 `<颜色>` 指定颜色，例如 `So-net<red>;CDN<blue>`
- 支持所有 [Radix UI 颜色](https://www.radix-ui.com/themes/docs/theme/color)：Gray、Gold、Red、Blue、Green、Purple、Teal、Sky 等
- 自动分配颜色：未指定颜色的标签会根据文本哈希自动分配视觉上区分度高的颜色

### 服务监控
- 30 天服务可用性监控，按日统计在线/离线/延迟
- 数据来源于 Komari 的 `common:getRecords` ping 任务
- 平均延迟计算自动排除无数据的天数

### 其他改进
- 服务器详情页移除了 GPU 部分（Komari 后端不支持 GPU 数据）
- 页头站点描述从 Komari 后端设置中获取
- 干净的代码库，无外部脚本依赖

## 安装方法

### 方法一：通过 Komari 管理面板上传
1. 从 [Releases](https://github.com/BITJEBE/nezha-BITJEBE/releases) 下载最新的 zip 文件
2. 进入 Komari 管理面板 -> 主题管理
3. 点击上传并选择 zip 文件

### 方法二：从源码构建
```bash
git clone https://github.com/BITJEBE/nezha-BITJEBE.git
cd nezha-BITJEBE
npm install
npm run build
```
构建产物位于 `dist/` 目录。将 `dist/` 与 `komari-theme.json` 一起打包为 zip 文件，上传至 Komari 即可。

## 配置说明

### 流量限制
在 Komari 后端按服务器设置：
- `traffic_limit`：流量上限（字节）
- `traffic_limit_type`：`sum` | `max` | `min` | `up` | `down`
- `expired_at`：到期日期（用于计算流量重置倒计时）

### 标签
在 Komari 后端的标签字段中按服务器设置：
```
So-net<red>;1Gbps<green>;CN2 GIA<blue>
```
- 多个标签以 `;` 分隔
- 追加 `<颜色>` 指定颜色
- 未指定颜色的标签自动分配颜色

## 技术栈

- React 19 + TypeScript
- Vite 6
- Tailwind CSS 3
- TanStack React Query
- Recharts
- Framer Motion
- i18next（中文 / 英文）

## 致谢

- 原始主题：[nezha-dash-v1](https://github.com/Akizon77/nezha-dash-v1)，作者 [Akizon77](https://github.com/Akizon77)
- 监控后端：[Komari Monitor](https://github.com/komari-monitor/komari)

## 贡献者

- [BITJEBE](https://github.com/BITJEBE) - 项目所有者
- [Claude](https://claude.ai) - AI 辅助开发

## 许可证

MIT
