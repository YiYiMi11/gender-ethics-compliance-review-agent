# 性别伦理合规审查 AGENT 展示网站

一套面向公司官方账号的内容预审智能系统的前端展示页面。它通过可视化的方式展示 AGENT 的审查原则、风险等级判定体系、审查流程、真实案例及安全改写能力，并提供了**在线体验入口**，可直接与部署在 HiAgent 平台上的审查智能体进行交互。

## 功能概览

| 模块 | 说明 |
|------|------|
| Hero 首屏 | AGENT 品牌展示 + 标语 |
| 什么是性别伦理合规审查 | 核心定义、性别伦理与公序良俗两大目标、六大适用场景 |
| 六大审查原则 | 6 项基本原则，可展开查看详细说明 |
| 四级风险判定 | 🔴红色拦截 / 🟠橙色高可疑 / 🟡黄色需复审 / 🟢绿色安全 |
| 审查流程 | 6 步骤分层递进式审查架构 |
| 三大扫描层级 | P0 绝对禁止 / P1 高风险对立词 / P2 无意识偏见 |
| 知识库架构 | 12 个知识库文件的四层分级结构 |
| 真实案例审查效果 | 5 个真实品牌案例（OPPO/蓝月亮/爸爸糖/极氪/奔驰） |
| 安全改写能力 | 9 大业务场景的改写对比示例 |
| 跨平台敏感度适配 | 5 大平台敏感度指示 |
| 法律依据 | 6 部法律法规核心条款卡片 |
| **在线体验** | 输入文本 → 选择平台 → 实时流式审查结果 |

## 技术栈

- **前端**：原生 HTML + CSS（Noto Serif SC / Noto Sans SC）+ JavaScript
- **后端**：Node.js + Express
- **排版渲染**：marked（Markdown → HTML）+ highlight.js（代码高亮）
- **API**：HiAgent 智能体平台（SSE 流式接口）

## 项目结构

```
gender-ethics-compliance-review-agent/
├── public/                  # 前端静态资源
│   ├── index.html          # 主页面（13 个展示区块）
│   ├── style.css           # 全局样式（响应式设计）
│   ├── app.js              # 交互逻辑（平滑滚动 + 流式对话）
│   └── LOGO.png            # 品牌 Logo（透明背景 PNG）
├── server.js               # Express 后端（API 代理 + 日志）
├── package.json            # 项目依赖配置
├── .env                    # 环境变量（API 密钥等）
└── README.md               # 本文件
```

## 快速开始

### 前置条件

- Node.js 18+（推荐 v20 LTS）
- 一个可用的 HiAgent API 访问凭据（包括 `API_BASE_URL` 和 `API_KEY`）

### 安装步骤

```bash
# 1. 进入项目目录
cd gender-ethics-compliance-review-agent

# 2. 安装依赖
npm install

# 3. 配置环境变量
# 编辑 .env 文件，填入你的 API 信息：
#
#   API_BASE_URL=https://your-hiagent-instance/api/proxy/api/v1
#   API_KEY=your-api-key-here
#   PORT=3000

# 4. 启动服务
npm start

# 5. 浏览器打开
# http://localhost:3000
```

### 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `API_BASE_URL` | 是 | HiAgent API 基础地址（含 `/api/proxy/api/v1`） |
| `API_KEY` | 是 | HiAgent API 密钥 |
| `PORT` | 否 | 监听端口，默认 3000 |

## API 接口说明

### `POST /api/chat`

**请求体**：
```json
{
  "query": "待审查的文本内容",
  "platform": "微博"
}
```

`platform` 可选值：`微博` / `小红书` / `抖音` / `知乎` / `微信公众号`

**响应**：SSE（Server-Sent Events）流式返回，格式如下：

```
data: {"content":"审查结果文本内容..."}
data: {"content":"后续增量内容..."}
data: [DONE]
```

**后端日志**：每次请求会输出详细的阶段日志，方便排查问题：

```
[2026-05-17T06:42:10.796Z] [REQ-0001] INCOMING | query="欢迎各位小仙女..." platform="微博"
[2026-05-17T06:42:10.799Z] [REQ-0001] REQUEST_START | /create_conversation body=...
[2026-05-17T06:42:11.234Z] [REQ-0001] REQUEST_OK | /create_conversation status=200 elapsed=435ms
[2026-05-17T06:42:11.235Z] [REQ-0001] CONVERSATION_CREATED | id=d84m37ca... elapsed=436ms
[2026-05-17T06:42:15.802Z] [REQ-0001] REQUEST_COMPLETE | total_elapsed=5002ms
```

## 交互特性

- **平滑滚动吸附**：滚轮、触摸滑动、键盘（↑↓/PageUp/PageDown/Home/End）均支持
- **长内容自由滚动**：内容高于视口的 section 可自由完整浏览，滚到底部才吸附到下一节
- **AI 思考动效**：双层旋转环 + 脉冲核心动画，配合分步提示文字（语义解析→知识库检索→风险匹配→生成报告→优化建议）
- **流式输出**：首段内容到达即显示，后续逐字增量渲染
- **响应式布局**：支持桌面端和移动端

## 自定义指南

### 修改 Logo

替换 `public/LOGO.png` 即可，建议尺寸 120px × 120px 以内的透明背景 PNG。

### 修改品牌色

编辑 `public/style.css` 中的 `:root` 变量：

```css
:root {
    --accent: #b91c1c;       /* 主色调 */
    --bg-dark: #1c1917      /* 深色背景 */
    --bg-dark2: #292524     /* 深色背景（二级） */
}
```

### 修改案例内容

编辑 `public/index.html` 中 `id="cases"` 的 section 内的案例数据。

## License

MIT