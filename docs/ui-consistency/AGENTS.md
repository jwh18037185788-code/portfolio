# AGENTS.md — UI Consistency Rules

## 适用范围与必读规范

凡涉及**新增页面、新增模块、组件开发、UI 调整、样式修改、页面重构、基础组件替换或新增**，都应优先阅读并遵守 [UI_Consistency_Development_Skill.md](.spec/UI_Consistency_Development_Skill.md)。

本文件基于 `AGENTS_UI_Consistency_Snippet.md`，保留长期硬规则；详细流程、背景、自检及交付要求见完整规范。文档沿用仓库已有 `.spec/` 目录，跨模块规范放在根层，功能专项规范保留在各自子目录。完整规范中的 `docs/` 为通用示例，本仓库实际路径是 `.spec/UI_Consistency_Development_Skill.md`。

## 核心原则

- 开发前扫描代码库，找到 2～5 个最接近的当前页面、组件或样式，先说明可复用内容、参考结构与确需新增的部分，再开始实现。不要按历史代码数量判断参考价值。
- 优先复用目标模块当前稳定使用的组件、Design Token、CSS 变量、公共样式、Ant Design 配置及交互模式，不猜测或重新设计视觉体系。
- 组件实现优先级：**直接复用 > 扩展已有组件 > 组合已有组件 > 确实无法复用时新建组件**；基础 UI 的复用必须符合下方 Ant Design 边界，不能以复用为由扩散 Roo。
- 新模块的颜色、字号、字重、圆角、边框、背景、卡片、按钮、Tag、表单控件、间距及信息层级保持一致；hover、active、selected、disabled、loading、empty、error 等状态及交互沿用当前模式。
- 不自行新增 UI 库、CSS 框架或颜色、字号、圆角、阴影体系。除非需求明确要求，不修改全局主题、公共组件默认行为或无关页面，也不为“统一风格”重构稳定业务代码。
- 完成后按完整规范输出复用的组件、样式和参考页面，确实新增的内容及理由，修改文件、影响范围、新增依赖情况，以及 Roo 样式影响与冲突处理情况。

核心原则：**先找现有实现，再开发；优先复用，不重新设计。**

## 规范优先级

**目标模块当前稳定使用的实现与约定 > 目标模块专项 UI / 开发规范 > 当前项目通用开发指南 > 历史规范、旧版设计和 Legacy 实现。**

- 不得为了满足较低优先级规范，对当前稳定模块进行无关重构；可兼容的既有要求继续遵守，不重复建立另一套规则。
- 下方四类冲突已经确定处理原则，不作为待确认项；历史 Roo 即使仍在稳定运行，也不因此成为新增开发的基线。
- 若仍有无法按上述优先级判断的冲突，明确列出来源、冲突点、影响范围与建议，不自行覆盖或做大范围改造。

## 四类已确认的冲突处理

### 1. 内联样式

- 不为消除内联样式而重构现有稳定页面；小范围、一次性的局部样式可沿用目标模块方式。
- 多处重复的颜色、间距、按钮、Tag、卡片、状态等样式优先复用已有组件、Token、变量或公共样式，避免继续扩大重复内联样式。
- 新增样式限定在当前模块作用域，避免全局污染。抽取公共样式同样须遵守任务范围，不能借复用改变无关页面或公共默认行为。

### 2. 当前视觉与 Legacy 视觉

- 新增页面和新模块默认继承当前任务模块的**紫色主题、12px 圆角体系、卡片默认无阴影**，文字、语义色、边框、间距等从现行实现复用。
- 历史黄色主题、16px 卡片圆角及阴影体系属于 Legacy，仅用于维护对应历史页面，不得作为新增页面或新模块参考，不在新模块中混用新旧视觉。
- 复用 [theme.ts](src/pages/bd-task/theme.ts) 的 `MT`、`MT_THEME`、`MT_BTN`、`MT_FILLED_TAG_STYLE` 等现有常量。12px 基线不表示把所有控件改成 12px：按钮、输入框、小卡片、Tag 等继续使用各自现有 Token / 预设；不要因 `MT.yellow` 等兼容字段的旧名称误判其当前色值。

### 3. 命名与目录组织

- 采用“就近一致”：新增文件优先参考目标目录中现有同类文件的命名方式、层级和结构。
- 不仅为满足通用命名规范而重命名、移动或重构稳定文件。
- 只有新建完全独立模块且无现成模式可参考时，才采用项目通用命名规范。

### 4. Ant Design 与 Roo

- **Ant Design 是唯一的新开发 UI 组件基线。**所有新增页面、模块和基础 UI 控件只使用 Ant Design 或项目现有 Ant Design 封装。
- 禁止在新代码中新增 Roo 组件、Roo import、Roo class、Roo selector、Roo 样式依赖或基于 Roo 的新封装。没有合适封装时基于 Ant Design 实现，不复制历史 Roo。
- 现有 Roo 暂时保留、冻结范围，仅作必要维护；不全局禁用或删除，不借普通业务需求扩大 Roo 使用或顺手清理。
- 新 Ant Design 页面或组件出现样式异常时，优先排查 Roo 全局 CSS、宽泛选择器、reset、CSS specificity 和加载顺序；通过局部隔离、提高作用域准确性或在已确认影响范围内修复冲突样式解决，不重新使用 Roo 来规避问题。
- Roo 彻底移除属于独立技术治理任务，须先盘点依赖、逐模块迁移、完成视觉和交互回归，最后再删除依赖；普通功能开发不包含此授权。

## 既有文档的适用范围与当前参考入口

- [README.md](README.md)、[DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)、[guide.md](guide.md)：通用开发约束，保留类型、API、状态管理、ESLint / Prettier 等要求；避免内联样式、通用文件命名等差异按上述裁决执行。通用示例的渐变、阴影不能代替现行任务模块视觉。
- [GUI 页面升级设计](.spec/task-management-gui-update/gui-page-upgrade/03_design_spec.md)：任务模块 Ant Design + inline style + TypeScript 样式常量路线仍可参考，历史黄色、16px 卡片和阴影示例属于 Legacy，不用于新增功能。
- [任务工作台设计](.spec/task-workbench/03_design_spec.md)：工作台专项规范，结合当前实现和范围声明阅读；其中 Roo 组织选择器方案属于历史方案，不作为新增开发依据。当前 `OrgTreeSelector.tsx`、`CitySubFilter.tsx` 已采用 Ant Design `TreeSelect`。
- [任务卡片间距与 AI 外呼设计](.spec/card-layout-and-ai-call-position/03_design_spec.md)：对应功能的局部行高与展开交互约束，保持其最小改动范围；其他功能继续阅读 `.spec/` 中对应专项文档，不将历史任务清单视为新的开发授权。
- 主题接入参考 `src/pages/bd-task/Layout.tsx` 的 `MT_THEME` 和 [MtThemeProvider.tsx](src/pages/bd-task/MtThemeProvider.tsx)；前者用于任务布局，后者用于独立执行页。不得为了接入新页面而改写无关稳定页面的主题作用域。
- 组件复用入口：`src/components/`、`src/pages/bd-task/components/`、`src/pages/bd-task/workbench/components/`。可按需求核对 `StatCard`、`TaskCard`、`ShopCard`、`WorkbenchFilterBar` 及上述两个 Ant Design 选择器，使用前核实当前实现。

## 接入时的 Roo 检查记录

以下为 2026-09-17、提交 `67ae4cc` 的静态检查快照，后续修改前应重新核实，不能作为永久无风险结论：

- `package.json` 同时保留 `antd`、`@roo/roo`、`@roo/roo-plus`；`vite.config.ts` 保留 Roo 默认主题模块的 `moduleSideEffects: 'no-treeshake'` 处理；`useOrgTree.ts` 及历史设计仍有 Roo 适配说明。
- 当前自有 `src/` 中未检出直接 Roo import 或 Roo class / selector，两个组织选择器实际使用 Ant Design。可确认依赖与历史方案共存，不能据此断言当前页面正在混用两库组件。
- 本地已安装 Roo 的 `theme/default/base.css`、`index.css` 含 `html`、`body`、通配符、`button`、`input` 等全局 reset / 元素规则；若进入页面样式链，可能影响字体、行高、盒模型及表单控件。构建副作用配置本身不等于这些样式已被加载。
- `src/lib/useCrmAiModule.ts` 会动态加载外部远程组件，其内部依赖与运行时样式未在本次静态检查中验证；不能排除宿主或远程组件注入 Roo 样式。当前未确认具体页面存在 Roo 导致的视觉缺陷。
- `src/assets/styles/globals.css` 自身也含全局 reset 和 `.ant-*` 覆盖。出现异常需检查实际样式来源、优先级和加载顺序，不把所有冲突归因于 Roo。本次仅记录，未修改任何实现、样式、依赖或构建配置。

本次仅接入规范；用户确认接入结果前，不开始新的业务功能开发，不执行组件替换、Roo 清理、视觉或目录重构。
