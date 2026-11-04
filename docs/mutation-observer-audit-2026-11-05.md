# MutationObserver 异常专项排查

排查时间：2026-11-04 晚至 11-05 凌晨。仅诊断和记录，没有修改网站运行代码，没有提交或推送。

## 结论与边界

- **已定位到内置浏览器 / 自动化环境这一层，未发现来自项目自有观察器的证据。** 不含任何脚本的父页面和空白 iframe，在该环境中也复现了相同异常；同一对照页在独立 Chrome 访客窗口没有出现该异常。
- 独立 Chrome 访客窗口中的首页、选集、返回设计思考、高清图弹窗、连续配图切换、文档/图片互换均通过，未观察到该异常影响普通访问。
- **不建议仅因这条环境异常暂停 GitHub / Cloudflare 发布。** 它不需要通过修改或删除图片加载器、文字观察器、Demo 来“修复”。本轮没有执行发布。
- **定位精度需如实说明：具体是哪一个内部注入文件、哪一行，仍未取得。** 现有错误日志接口只返回 level、message、timestamp，没有错误堆栈、源 URL 或行列号。不能把“定位到环境层”表述成已经拿到了某个注入脚本的完整失败堆栈，也不能声称所有浏览器均已穷尽验证。

## 完整可获取的错误信息

```text
Uncaught TypeError: Failed to execute 'observe' on 'MutationObserver': parameter 1 is not of type 'Node'.
```

本轮重载原始本地首页再次出现，UTC 时间为 `2026-11-04T15:46:51.944Z`。不带诊断探针的零脚本 iframe 对照随后出现同样文本，UTC 时间为 `2026-11-04T15:46:52.325Z`。带诊断探针、仍不加载项目脚本的对照也出现同样文本，时间为 `2026-11-04T15:54:43.885Z`。

这些记录中的源文件、行号和错误堆栈均未由工具暴露。页面及子 frame 的 window.error / unhandledrejection 捕获、MutationObserver 构造与 observe/回调包装未捕获到对应的项目侧失败。诊断包装在异常时记录并重新抛出，不吞错；因此没有用“清空控制台”或全局错误屏蔽制造通过结果。

另捕获到匿名代码注册观察器的调用位置：

```text
at to._setupGlobalListenersRemovalDetection (<anonymous>:24:2182)
```

这段注册调用不属于仓库脚本。**它是一次成功注册的调用栈，不是本次异常的失败堆栈，不能据此断言这个函数就是抛错点。**

## 排除项目代码的对照

临时服务和所有诊断代码均位于 `/private/tmp/portfolio-mutation-qa`，未写入生产 HTML / JS。

不带探针的对照父页实际返回 184 字节：

```html
<!doctype html><html><head><meta charset="utf-8"><title>Observer isolated fixture</title></head><body><h1>No project JavaScript</h1><iframe src="/fixture/empty"></iframe></body></html>
```

子页为相同标题和一行 h1，146 字节。已读取 HTTP 响应核对：父页和子页的 script 标签数均为 0，无项目图片、字体、第三方库或网站观察器实现。HTML 字节与 SHA-256 已存入证据 JSON。

| 环境与页面 | 结果 |
| --- | --- |
| 内置自动化浏览器，原始作品集首页 | 再次复现相同错误 |
| 内置自动化浏览器，零脚本父页 + 零脚本 iframe | 复现相同错误；不依赖项目代码 |
| 内置自动化浏览器，带临时诊断探针的空 iframe 对照 | 汇总日志仍复现；页面级错误捕获没有同类事件 |
| 独立原生 Chrome 访客窗口，原始作品集 | 核心交互通过，未见同类异常 |
| 同一 Chrome 访客窗口，零脚本 iframe 对照与重载 | 未见同类异常 |

访客窗口不复用用户日常 Chrome 个人资料/扩展环境；通过操作系统无障碍界面、鼠标键盘和原生 DevTools 验证，没有使用 Playwright 向页面注入诊断逻辑。对照支持将问题归于内置测试环境；尚不能进一步区分内部自动化 helper、内部扩展或其具体初始化时序。

## 项目观察器核对

| 实现 | 注册位置 | 目标 | 单个首页中的 observe 次数 | 动态操作后的回调次数 |
| --- | --- | --- | ---: | ---: |
| image-loading.js | 309 行创建，311 行 observe | #main，Element，connected=true | 1 | 9 |
| text-actions.js | 72 行创建，77 行 observe | body，Element，connected=true | 1 | 21 |
| text-balance.js | 21 行 | body，Element，connected=true | 1 | 12 |

以上是同一个首页离开前的单次实测计数，不是跨页面累加。返回首页后是新的 document，各实现重新各注册一次，未发现对同一 document 重复初始化。选集页面只注册两处 body 观察器；image-loading.js 按原设计跳过首页图片区域观察器。

- image-loading.js 在 DOMContentLoaded 后查找 main，缺失时直接返回；图片框用 WeakSet 避免重复准备。
- 文字增强脚本是 defer 执行，body 已存在；分别用 data-text-action-ready / data-tail-balanced 保持增强幂等，避免观察自身新增结构时无限重复包装。
- 三处回调处理 addedNodes 并检查节点类型；没有把 removedNodes 直接传给 observe 的实现。动态替换整个图片区、恢复图片区及切换卡片后，未观察到空目标、回调抛错或未处理的 Promise rejection。
- “节点已从文档移除”与“observe 参数不是 Node”不能直接等同。本次没有通过给节点强加 isConnected 限制来掩盖错误，也没有删掉动态内容观察。
- Demo 构建依赖还包含 modulepreload / ResizeObserver 兼容回退中的观察器，目标是 document。当前 Chromium 的原生能力已覆盖这些回退，带探针的 Demo frame 记录中未发现它们实际创建观察器；Demo 回归可正常渲染。

## 功能回归与交付

原生 Chrome 访客窗口验证了：

1. 首页及嵌入 Agent Demo 正常呈现。
2. 进入作品选集，封面正常显示。
3. 浣熊经营分高清图完整展示，视图切换、关闭正常。
4. 顶部导航返回设计思考正常。
5. CatDesk、Codex、Figma Make 连续配图切换正常。
6. UI 一致性文字文档区切换、恢复 Demo 图片正常。

DevTools 开启 Preserve log；项目链路完成后仅有两条蓝色导航日志，访问空 iframe 对照后为三条导航日志。未把“导航消息数”当作“错误数”。

带临时观察器探针的独立副本还验证了：文档与图片区互换、任务卡片优化前后切换、选集筛选、高清图加载状态和弹窗按钮、底部返回设计思考。项目回调异常记录为 0，未处理 rejection 记录为 0。

本轮只新增本报告、结构化证据，并更新上一轮报告的待查项结论；JS、CSS、HTML、图片、Demo 和部署配置均没有进一步修改。诊断页面/探针不参与 Cloudflare 或 GitHub 发布。临时访客窗口及诊断标签已关闭。

[结构化证据与注册调用栈](mutation-observer-evidence-2026-11-05.json)
