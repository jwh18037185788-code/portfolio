# 任务管理 Agent · 作品集独立演示

此目录可整体合入作品集代码仓库。源码与静态产物一起交付，之后只需修改源码并重新构建。

## 目录

```text
demo-src/task-agent/       独立 React + TypeScript 演示工程
  src/pages/bd-task/      复用的工作台、列表、卡片、筛选和弹窗
  src/mocks/             随生产产物打包的虚构数据
  src/services/          仅调用本地 mock 的服务适配层
  src/router/            Hash 路由
  src/assets/            品牌图案、风险图标、商家头像和已有样式
  scripts/               无历史路由回退的静态预览服务及验证脚本
  package.json           独立依赖与命令
  package-lock.json      npm 公共仓库锁文件
demos/task-agent/          可直接部署的构建结果
README.md                 本接入说明
SOURCE-NOTES.md           复用范围、演示边界和改动说明
VALIDATION.md             交付验证记录
```

交付包不含 `node_modules`、`.git`、`.env*`、公司部署配置、私有 npm 依赖或凭据。

## 安装与开发

使用 Node.js 20.19+ 与 npm（本次在 Node.js 24.19.0 验证）。以下命令从作品集仓库根目录执行：

```bash
npm --prefix demo-src/task-agent ci
npm --prefix demo-src/task-agent run dev
```

开发默认端口 5173；被占用时 Vite 自动选择后续端口，以终端实际输出为准。打开输出地址并访问 `/#/bd-task`。无需原业务工程、登录、VPN、接口服务或 `?mock=` 参数。

请不要把演示包注册成主站的 workspace，也不要把演示依赖添加进主站的 `package.json`。两者分别安装，分别构建。

## 构建与更新展示

```bash
# 在作品集仓库根目录执行
npm --prefix demo-src/task-agent run build
```

该命令先做 TypeScript 检查，再构建并验证产物。结果自动覆盖**当前交付目录内的** `demos/task-agent/`。不需要手动拷贝资产，不会改动主站构建目录。

每次修改后执行同一命令，然后在作品集仓库中一起保存 `demo-src/task-agent/` 的源码改动和 `demos/task-agent/` 的最新产物。依赖不变时无需重复安装；有意调整依赖后用 `npm install` 更新锁文件，并保存 `package-lock.json`。

保留 `demo-src/` 与 `demos/` 的相对位置。构建器会清理旧的 `demos/task-agent/` 后写入新产物，因此不要在产物目录手工保存其他文件。

## 独立预览静态产物

```bash
npm --prefix demo-src/task-agent run preview
```

默认地址：`http://127.0.0.1:4173/#/bd-task`。这是普通静态文件服务，不是开发服务器，也不依赖 SPA 的 history fallback。

端口已占用时可指定其他端口；可同时模拟作品集的子目录部署：

```bash
npm --prefix demo-src/task-agent run preview -- --port 4174 --base /my-portfolio/demos/task-agent/
```

此时入口为 `http://127.0.0.1:4174/my-portfolio/demos/task-agent/#/bd-task`。这里的本机地址仅用于说明预览命令，网站资源与路由没有硬编码本机地址。不要双击用 `file://` 打开 `index.html`，ES Module 需要 HTTP 静态服务。

## 入口与直接访问

| 页面 | 在静态目录入口后添加的 Hash |
| --- | --- |
| 工作台「重点关注」 | `#/bd-task` |
| 工作台「详细数据」及批次执行明细 | 在工作台点击「详细数据」 |
| 任务批次列表 | `#/bd-task/batch-list` |
| 批次详情（基础样例） | `#/bd-task/201996411723` |
| 批次详情（工作台关联样例） | `#/bd-task/202610290201` |
| 任务项列表 | `#/bd-task/shops` |
| 商家任务详情（大自然农庄） | `#/bd-task/shops/90002` |
| 商品 SKU 批次详情 | `#/bd-task/202610290221` |
| 业务品牌详情（先切换连锁业务） | `#/bd-task/brands/73001` |
| 拼好饭商品批次（先切换下沉市场） | `#/bd-task/201996411728` |

例如 GitHub Pages 仓库站点可使用：

```text
https://<用户名>.github.io/<作品集仓库>/demos/task-agent/index.html#/bd-task
```

`base: './'` 生成相对资源路径，`createHashRouter` 把页面路径放在 `#` 后。刷新、复制详情地址和在任意子目录直接打开时，服务器只请求现有的 `index.html`，无需 404 重写或业务网关。

## 在主站中用 iframe 接入

普通 HTML 示例（以作品集根路径下的页面为例）：

```html
<iframe
  src="./demos/task-agent/index.html#/bd-task"
  title="任务管理 Agent 交互演示"
  width="100%"
  height="960"
  loading="lazy"
  style="display:block;border:0;border-radius:12px"
></iframe>
```

若作品集主站使用 Vite，使用主站已有的 `BASE_URL` 适配 GitHub Pages 仓库子路径；不需要把演示组件导入主站：

```tsx
const demoUrl = `${import.meta.env.BASE_URL}demos/task-agent/index.html#/bd-task`;

<iframe
  src={demoUrl}
  title="任务管理 Agent 交互演示"
  style={{ width: '100%', height: 960, border: 0, display: 'block' }}
  loading="lazy"
/>
```

如果主站有更深的页面路由，使用主站的部署根路径构造 `src`，避免相对当前路由拼接。给 iframe 分配足够宽度，桌面端建议可用宽度 ≥ 1200px；窄容器沿用原界面响应式与内部滚动行为。不要在主站中引入演示的 CSS 或 React 入口，iframe 会隔离两者的样式、React 运行时和依赖。

如主站要求 `sandbox`，本演示需要 `allow-scripts allow-same-origin` 才能运行和使用本地偏好存储；详情新窗口需要 `allow-popups allow-popups-to-escape-sandbox`，CSV 导出需要 `allow-downloads`。也可在主站额外提供“新窗口查看演示”链接。

## 让主站部署包含演示产物

GitHub Pages 发布的是最终静态目录。仅把 `demos/` 放在仓库里，不代表主站构建器会自动发布它。

- 直接发布仓库根目录：保留 `demos/task-agent/` 即可。
- 主站构建到 `dist/`：在主站构建完成后，将已生成的 `demos/task-agent/` 复制到 `dist/demos/task-agent/`，再上传 `dist/`。
- 不需要在访问者浏览器中编译源码，也不需要在 GitHub Pages 上运行 Node。

可在主站构建脚本中使用 Node 文件复制（路径按主站实际输出目录调整）：

```bash
node -e "require('node:fs').cpSync('demos/task-agent','dist/demos/task-agent',{recursive:true})"
```

本次交付**没有修改你的作品集项目、构建脚本或部署工作流**，上述仅为接入说明。

## 日常修改位置

- 调整页面/卡片/弹窗：`demo-src/task-agent/src/pages/bd-task/`。
- 修改颜色与组件 Token：`src/pages/bd-task/theme.ts`。
- 调整任务、商家、SKU 与跨页关联：`src/mocks/demoTaskDataset.ts`。
- 调整业务类型及批次名称：`src/mocks/demoBusinessCatalog.ts`。
- 调整租户及实体类型顺序：`src/mocks/demoTenant.ts`。
- 调整筛选、统计及本地模拟操作：`src/mocks/bdTaskBaselinePreview.ts`。
- 商家头像资源及来源：`src/assets/merchants/`（均为本地文件）。
- 调整重点关注、四象限、来源与 Agent 样例：`src/mocks/workbenchFocusPreview.ts`。
- 调整执行明细矩阵：`src/mocks/batchExecutionPreview.ts`。
- 调整导航与直接访问入口：`src/router/index.tsx`。
- 原工程的主题、接口或构建配置不会自动同步到本副本；本演示源码独立维护。

## 交互范围

保留三大页面、两个工作台页签、9 个业务类型、条件筛选与重置、分页、卡片展开、工作台风险与业务类型明细弹窗、督办概览、任务详情、AI 结果浮层、批次执行矩阵的勾选/维度/周期切换及 CSV 导出。

演示数据共 30 个批次：28 个公共样例、连锁业务专属品牌样例 1 个、下沉市场专属拼好饭商品样例 1 个。按租户范围分别显示 28 / 29 / 29 个；列表默认的“仅看未过期任务”还会缩小可见数量。外卖门店 300 家、公海门店 30 家，每家均有关联的至少 3 个批次，包含 SKU 分组、多种执行状态、AI 结果与无法完成原因。工作台重点关注保留 24 个批次、24 位 BD、6 种 Agent 和 4 类来源的独立展示快照。

租户可切换“外卖白领 / 连锁业务 / 下沉市场”；环境可切换“测试环境（Test）/ 预发环境（Staging）/ 线上环境（Prod）”。这些均为本地展示选项，不切换任何接口。实体类型固定为“外卖门店、公海门店、商品、行业商家、行业商品”，连锁业务在末尾追加“业务品牌”，下沉市场在末尾追加“拼好饭商品”。无数据的标签置灰。业务类型统计与顺序保持首次基线，其他筛选联动置灰；商家详情默认包含过期任务，和商家列表保持一致，可主动开启未过期筛选。

商家名称与头像参考用户提供的线上展示，资源来源记录在 `src/assets/merchants/SOURCES.md`。人员、地址、经营指标和执行结果等均为演示数据，不代表商家真实经营情况。日期按运行时生成，包含临期与过期状态样例。

不调用公司 SSO、接口、模型、远程微前端或埋点；未包含的请求会明确失败，不会转发到任何服务。督办与执行按钮显示“模拟”流程。新建/修改任务助手为本地草稿演示。列表内编辑、反馈与移除仅作用于当前浏览器内存，刷新恢复；工作台统计样例为独立快照，不随列表内写操作联动更新。

静态 HTML 的 CSP 设置 `connect-src 'none'`、`frame-src 'none'`，生产演示没有接口请求或外部 iframe。开发模式仅为 Vite HMR 放开本地连接。字体使用系统回退，不依赖 Google Fonts；这可能与原页面成功加载网络字体时的字形有细微差别。
