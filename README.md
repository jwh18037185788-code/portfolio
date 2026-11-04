# Jhuen. Design

蒋雯蕙的中文体验设计作品集，呈现复杂系统、AI 产品与代码交付实践。

网站使用原生 HTML、CSS、JavaScript，无需安装依赖或构建。

## 访问

- 网站：https://jwh18037185788-code.github.io/portfolio/
- 作品选集：https://jwh18037185788-code.github.io/portfolio/visual/

通过 GitHub Pages 发布，发布来源为 `main` 分支根目录。更新并推送后，GitHub 自动重新发布。

## 本地预览

在仓库目录运行：

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4173/`。GitHub Pages 的 404 页面使用 `/portfolio/` 路径。

## 文件

- `index.html`：首页入口与通用框架
- `visual/index.html`：作品选集入口
- `app.js`：文案、案例与页面交互
- `style.css`、`dark.css`：字体、排版、暗色主题与响应式布局
- `hero-trail.js`：首屏鼠标图片轨迹
- `assets/`：作品素材、本地字体及字体许可

中文字体使用抖音美好体，许可文件位于 `assets/OFL-DouyinSans.txt`。联系邮箱：1466918516@qq.com。

修改脚本、样式或替换图片时，请同步更新对应资源 URL 的版本标识，避免浏览器使用旧缓存。

## 素材说明

作品素材来自本人提供的设计稿、原型与截图。部分 Agent 工作台、任务卡及 AI 咨询面板为已标注的结构示意，使用示例数据。首屏轨迹使用本人提供的 9 张图片，按数字顺序循环。

## 任务管理 Agent 交互演示

首页“先看清，再行动”下方通过 iframe 加载 `demos/task-agent/index.html#/bd-task`，桌面端可直接操作或点击“展开体验”；手机端可从预览图打开演示。

- 可编辑源码：`demo-src/task-agent/`，与主站分别维护依赖和构建。
- 静态产物：`demos/task-agent/`，随仓库根目录一起发布。
- 演示说明及交付记录：`docs/task-agent-demo/`。

在本仓库根目录安装演示依赖并构建：

```sh
npm --prefix demo-src/task-agent ci
npm --prefix demo-src/task-agent run build
```

构建会更新本仓库的 `demos/task-agent/`。修改源码后，将源码与新产物一起保存。主站仍通过原有 Python 静态服务预览，无需安装主站依赖。

另存的 `outputs/wenhui-portfolio/dist` 是当前页面的本地副本；如继续使用该副本，需同步页面改动及 `demos/task-agent/` 产物。交互演示使用示例数据，无需登录或连接业务接口。
