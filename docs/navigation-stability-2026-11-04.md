# 跨页面锚点与布局稳定性修复（2026-11-04，本地）

## 已确认的原因

1. 两个入口原来都是空的 `<main id="main"></main>`，Footer 却已存在。弱网下首帧 main 子节点数为 0，Footer 位于 y=70（移动端 y=64）；app.js 随后用 innerHTML 插入整页，桌面文档高度由 960 增至约 12,504 px。LayoutShift 的主要受影响节点确实包括 Footer。
2. `../#work` 的原生片段定位发生时，目标可能尚不存在。全局 `scroll-behavior:smooth` 又让原生定位与 ScrollTrigger 的刷新/滚动位置保存恢复交错。原版两次桌面样本的最终 #work 顶边分别为 187.40、67.40 px，未稳定在原样式规定的约 90 px。
3. 字体、text-balance 和字体就绪后的 SplitText 发生在不同阶段。字体切换仍能改变正文换行和页头文字宽度；这些阶段必须在首次定位前完成。没有把 `.reveal` 原有的 22 px 位移动画算成布局偏移。
4. 图片预留尺寸和 Agent Demo 外层比例已在前轮工作中建立：本轮未发现它们是上述 Footer 大幅跳动的来源，未重复改写图片加载器或 Demo。

## 修改范围

- `index.html`、`visual/index.html`：把原模板生成的 main 内容直接写入 HTML，提前提供真实结构、锚点、图片尺寸与占位；Footer 联系方式也直接存在。选集页面的初始 body class 与页面标题和运行后保持一致。
- `app.js`：只在缺少静态内容时执行旧的模板回退，不再清空、重建已有 main；联系方式避免重复插入。前轮的 8 张 v2 长图引用保留。
- `navigation.js`（新增）：协调首次片段定位、历史阅读位置恢复及页内主动平滑导航。
- `style.css`：浏览器默认滚动改为 instant；主动的页内导航由 JS 显式使用 smooth，保留其体验。准备首次定位时仅让 main/Footer 暂不绘制，真实布局仍参与计算。
- `home-split-text.js`：暴露现有初始化的 Promise，不改变字体、标题范围、字符动画参数或触发效果。
- `scripts/render-static-pages.cjs`（新增）：复用原来的模板/图片辅助函数生成静态 HTML，并提供 `--check` 防止模板和 HTML 不一致；没有新增部署构建步骤。

`home()` 和 `visual()` 的生成内容与修改前模板逐字比较一致。`sprint-case.js`、`image-loading.js`、`image-loading.css`、Demo React 源码和静态产物均未修改。

今后修改模板或图片元数据后运行：

```sh
node scripts/render-static-pages.cjs
node scripts/render-static-pages.cjs --check
```

## 如何只定位一次

- head 中在解析到锚点前捕获首次目标，以 replaceState 暂时移除片段，避免浏览器先执行一次原生片段滚动；不增加历史记录。
- 首次定位等待 `document.fonts.ready`、现有 SplitText 初始化 Promise 和一次 requestAnimationFrame，处理字体换行、拆字和文字尾行包装。完全不等待整页图片或全部高清长图。
- 按真实 offsetTop 计算目标位置，不使用带 reveal transform 的视觉坐标。pending 标记在唯一的导航 scrollTo 前清除；恢复 URL 仍使用 replaceState，不触发原生锚点滚动。
- scrollTo 使用 instant，下一帧允许正文绘制。没有循环校正、setTimeout 重试、虚构页面高度或全局禁用 Scroll Anchoring。
- 历史位置在 scrollend、pagehide 和页内 pushState 前保存。整页前进、后退、刷新使用对应历史条目的阅读位置，不一律拉回 URL 的原锚点；同文档 popstate 也由同一逻辑处理。BFCache 恢复不重新执行 DOMContentLoaded 定位。
- **“一次”指导航协调器的主动定位。** ScrollTrigger 原有刷新内部仍会同步保存、临时重置、恢复滚动值；去除 CSS 全局 smooth 后，这些内部操作不再展开成可见的滚动动画。逐帧检查中，正文呈现后的 scrollY 范围恒定。

## 浏览器实测

Chromium 内置浏览器；桌面 1440×960，移动布局 390×844。测试服务对 HTML/资源返回 `Cache-Control:no-store`；CSS/JS 延迟 400 ms，app.js 延迟 1,300 ms，字体延迟 2,500 ms，图片延迟 2,000 ms。这是固定响应延迟测试，**不是固定带宽的 Slow 3G**。

压力场景额外运行约 8 秒的主线程短任务（80 ms 忙任务后安排 100 ms 定时器），用于暴露时序问题；**不是 DevTools 4×/6× CPU 降频**。后台标签调度影响耗时，所以未把这些单次样本用作访问速度、LCP 或百分位承诺。

| 场景 | 修复前 CLS | 修复后 CLS | 修复后稳定落点 |
| --- | ---: | ---: | --- |
| 桌面直接打开 #work | 0.300261 | 0.000031 | scrollY=804，目标顶边 90.40 px |
| 桌面选集返回 #work | 0.300261 | 0.000009 | scrollY=804，目标顶边 90.40 px |
| 移动端直接打开 #work | 0.258476 | 0.000075 | scrollY=693，目标顶边 90.36 px |

以上 CLS 使用 LayoutShift 条目的 session window 最大值计算（排除 hadRecentInput，最大 5 秒、间隔不超过 1 秒）；另记录累计值，未混为一项。不是只凭 CLS 判断结果：同时记录 main 初始节点数、文档高度、Footer 坐标、scrollY、目标边界、字体状态及定位调用。

- 修复后首个采样帧 main 已有 12 个子节点；三个上述样本均没有“空 main 的 Footer 可见帧”。
- 呈现后 scrollY 区间分别为 [804,804]、[804,804]、[693,693]，导航协调器均只发出一次定位。
- 桌面 #about 主线程压力样本：scrollY=11224，目标顶边 89.76 px；移动端 #about 压力样本及刷新：scrollY=13130，目标顶边 89.58 px。呈现后位置恒定。
- 实际阅读返回链路：点击页中的“浏览完整作品选集”，后退恢复 scrollY=10024，未被 URL 的 #work 强制拉回 804；前进也正常返回选集。
- 自动化为点击页顶导航而先执行的 scrollIntoView/滚动属于测试操作，已与页面异常滚动分开。不能把从正文主动回到页顶点击链接前的坐标当作离页时阅读坐标。
- 最新移动端/关于我/阅读恢复样本在未打开弹窗时，高清项目长图请求数为 0。

[结构化测量记录](navigation-stability-measurements-2026-11-04.json) 保存关键布局时间线、LayoutShift 来源/前后矩形和导航调用；完整临时采样位于本机 `/private/tmp/portfolio-nav-qa/reports.jsonl`。

## 回归结果和发布兼容

已验证顶部“设计思考”、底部“回到设计思考”、顶部“关于我”、页面中部进入选集再后退/前进、直接 #work/#about、带锚点刷新、禁缓存与延迟响应、桌面/移动布局、主线程压力，以及有 HTTP 缓存的历史往返。

首页保留 11 个 SplitText 标题；图片占位尺寸存在，桌面 Agent Demo 外层实测 1237.81×777.07（保持 1440:904）。浣熊经营分弹窗实测先显示准备状态，随后完整的 3840×20858 图片进入 DOM，decodeMode=predecoded；视图切换和关闭正常。

按现有复制清单构造临时 public（为节省磁盘使用硬链接），检查根路径和 `/portfolio/` 前缀共 258 个引用，缺失数 0。新增 navigation.js 位于根目录，现有 `./*.js` 规则已覆盖。没有调整 Cloudflare 构建命令、输出目录、根目录或生产分支。

语法检查、静态内容一致性、HTML ID 唯一性、`git diff --check`、静态生成 `--check` 均通过。本轮没有修改 React 源码，无需重建 Agent Demo。未提交或推送。

## 仍需如实区分的边界

- 保留的 reveal 和 SplitText 动画仍会有正常的 transform/透明度变化；这不是文档高度变化，也不是重复导航。
- 页头在字体替换时仍有很小的文字尺寸变化，首页样本对应剩余约 0.00001–0.00009 的 CLS，选集页样本约 0.00037；未为消除这个数字更换字体、隐藏整页或改变设计。正文阅读位置未随之漂移。
- 测试环境的有缓存历史往返仍报告 pageshow.persisted=false，未实际命中 BFCache；BFCache 路径按“不重复初始化”保留，不能把本次结果宣称为已实测 BFCache 或所有真机浏览器。
- 没有真实设备或 DevTools CPU 倍速降频测试，主线程压力测试不能等同替代它们。
- 初次复核时曾记录到 3 条无脚本来源的 `MutationObserver.observe` 非 Node 参数异常，当时尚未定位。后续专项排查已在**不加载任何脚本的空 iframe 对照页**复现同类错误，并在独立 Chrome 访客窗口验证项目核心交互正常；已将其定位到内置浏览器/自动化环境层，不再作为本项目发布阻塞。具体内部注入文件、行列号和失败堆栈仍未由工具暴露。详见 [MutationObserver 专项排查](mutation-observer-audit-2026-11-05.md)。
