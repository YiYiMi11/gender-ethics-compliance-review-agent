# Gender Ethics Compliance Review AGENT Showcase

A front-end showcase page for an AI-powered pre-review system designed for company official social media accounts. The page visualizes the AGENT's review principles, risk classification system, review workflow, real-world cases, and safe rewriting capabilities. It also provides a **live demo** that directly interacts with the AGENT deployed on the HiAgent platform.

## Feature Overview

| Module | Description |
|--------|-------------|
| Hero Section | AGENT brand introduction + tagline |
| What Is Gender Ethics Review | Core definition, two goals (Gender Ethics / Social Norms), six scenarios |
| Six Review Principles | 6 expandable principles with detailed explanations |
| Four-Level Risk System | 🔴 Red (Block) / 🟠 Orange (Highly Suspicious) / 🟡 Yellow (Needs Review) / 🟢 Green (Safe) |
| Review Workflow | 6-step hierarchical review architecture |
| Three Scan Levels | P0 (Absolute Prohibition) / P1 (High-Risk Terms) / P2 (Unconscious Bias) |
| Knowledge Base Architecture | 12 knowledge base files organized in 4 layers |
| Real-World Case Study | 5 brand cases (OPPO / Blue Moon / Daddy Sugar / Zeekr / Mercedes-Benz) |
| Safe Rewriting Capabilities | 9 business scenario rewrite comparisons |
| Cross-Platform Sensitivity | Sensitivity indicators for 5 major platforms |
| Legal Basis | 6 core legal statute cards |
| **Live Demo** | Input text → Select platform → Real-time streaming review results |

## Tech Stack

- **Frontend**: Vanilla HTML + CSS (Noto Serif SC / Noto Sans SC) + JavaScript
- **Backend**: Node.js + Express
- **Rendering**: marked (Markdown → HTML) + highlight.js (code highlighting)
- **API**: HiAgent Agent Platform (SSE streaming interface)

## Project Structure

```
gender-ethics-compliance-review-agent/
├── public/                  # Frontend static assets
│   ├── index.html          # Main page (13 content blocks)
│   ├── style.css           # Global styles (responsive design)
│   ├── app.js              # Interaction logic (smooth scroll + streaming chat)
│   └── LOGO.png            # Brand logo (transparent PNG)
├── server.js               # Express backend (API proxy + logging)
├── package.json            # Project dependencies
├── .env                    # Environment variables (API key, etc.)
└── README.md               # Documentation (Chinese)
└── README.en.md            # Documentation (English)
```

## Quick Start

### Prerequisites

- Node.js 18+ (recommended v20 LTS)
- A valid HiAgent API credential (including `API_BASE_URL` and `API_KEY`)

### Installation

```bash
# 1. Enter the project directory
cd gender-ethics-compliance-review-agent

# Install dependencies
npm install

# Configure environment variables
# Edit the .env file with your API credentials:
#
#   API_BASE_URL=https://your-hiagent-instance/api/proxy/api/v1
#   API_KEY=your-api-key-here
#   PORT=3000

# Start the server
npm start

# Open in browser
# http://localhost:3000
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_BASE_URL` | Yes | HiAgent API base URL (includes `/api/proxy/api/v1`) |
| `API_KEY` | Yes | HiAgent API key |
| `PORT` | No | Server listen port (default: 3000) |

## API Reference

### `POST /api/chat`

Submits a content review request.

**Request Body**:
```json
{
  "query": "Text to be reviewed",
  "platform": "weibo"
}
```

`platform` options: `weibo` / `xiaohongshu` / `douyin` / `zhihu` / `wechat_mp`

**Response**: SSE (Server-Sent Events) stream:

```
data: {"content":"Review result text..."}
data: {"content":"Subsequent incremental content..."}
data: [DONE]
```

**Server Logging**: Each request outputs detailed phase logs for debugging:

```
[2026-05-17T06:42:10.796Z] [REQ-0001] INCOMING | query="Welcome everyone..." platform="weibo"
[2026-05-17T06:42:10.799Z] [REQ-0001] REQUEST_START | /create_conversation body=...
[2026-05-17T06:42:11.234Z] [REQ-0001] REQUEST_OK | /create_conversation status=200 elapsed=435ms
[2026-05-17T06:42:11.235Z] [REQ-0001] CONVERSATION_CREATED | id=d84m37ca... elapsed=436ms
[2026-05-17T06:42:15.802Z] [REQ-0001] REQUEST_COMPLETE | total_elapsed=5002ms
```

## Interaction Features

- **Smooth Scroll Snap**: Supports mouse wheel, touch swipe, and keyboard (↑↓ / PageUp / PageDown / Home / End)
- **Free Scrolling for Long Content**: Sections taller than viewport scroll freely; snap only triggers when reaching the section boundary
- **AI Thinking Animation**: Dual rotating rings with a pulsing core, paired with progressive step hints (semantic parsing → knowledge base retrieval → risk matching → report generation → suggestion optimization)
- **Streaming Output**: Displays content as soon as the first chunk arrives, incrementally renders subsequent chunks
- **Responsive Layout**: Supports desktop and mobile devices

## Customization Guide

### Changing the Logo

Replace `public/LOGO.png` with your own. Recommended size: transparent PNG, within 120px × 120px.

### Changing Brand Colors

Edit the `:root` variables in `public/style.css`:

```css
:root {
    --accent: #b91c1c;       /* Primary accent color */
    --bg-dark: #1c1917      /* Dark background */
    --bg-dark2: #292524     /* Secondary dark background */
}
```

### Changing Case Studies

Edit the case data inside the `<section id="cases">` block in `public/index.html`.

## License

MIT