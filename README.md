# AutoFlow AI ⚡

**AutoFlow AI** is a self-hostable, enterprise-ready workflow automation platform inspired by n8n, built with an original TypeScript architecture and first-class **Google Gemini** multi-modal AI and autonomous agent orchestration.

---

## 🌟 Key Features

- **Interactive Visual Canvas**: Full-featured node-based workflow canvas with draggable nodes, cubic bezier connections, port snapping, pan & zoom, and live status pulses.
- **Real-Time Fullscreen Flowchart Runner**:
  - Fullscreen workflow visualization tracking execution node-by-node.
  - Active node glowing rings and flowing animated SVG connector pulses in real time via Server-Sent Events (SSE).
  - Progressive status updates: nodes transition smoothly from *running* to *success* (green) or *error* (red).
- **AI Self-Healing & 1-Click Auto-Fix**:
  - Automatically diagnoses runtime errors (HTTP timeouts, missing parameters, invalid JSON, broken expressions).
  - Uses Gemini 3.8 Flash to analyze node configurations, runtime inputs, and error logs.
  - Proposes exact parameter patches and offers a **1-Click Apply & Re-Run** resolution.
- **1-Click Production Template Library**:
  - Curated, pre-built production workflows ready for instant deployment:
    1. **Telegram & Discord AI Support Agent**: Webhook intake, cryptographic verification, Gemini response generation, and multi-channel broadcast.
    2. **Daily Tech & AI News Digest**: Scheduled morning news scraper, Gemini executive synthesis, and alert dispatch.
    3. **Crypto Price Spike Alert**: REST market polling, threshold calculations, and high-priority push notifications.
    4. **Order Webhook Intake & Fraud Scorer**: E-commerce intake, SHA-256 data integrity checks, and high-value order routing.
    5. **Autonomous Research & Tool Loop**: Multi-turn agent loop with arithmetic, lookup, and verification tools.
  - Interactive modal with animated step-by-step canvas auto-generation.
- **Live Webhook Payload Simulator**:
  - Interactive simulator modal allowing developers to test webhooks on the fly.
  - Built-in Gemini Synthetic Payload Generator: describe your test scenario in plain English and generate realistic JSON mock payloads in seconds.
  - Immediate execution dispatch with live stream monitoring.
- **Multi-Modal Gemini Vision & Document Analysis**:
  - Integrated `GeminiNode` supporting `gemini-3.8-flash` and `gemini-3.8-pro`.
  - Native multi-modal vision inputs: pass base64 image strings, data URLs, or remote image/PDF links to extract receipts, analyze documents, or read diagrams.
- **Dedicated App Connectors**:
  - **Telegram Node**: Send markdown messages, alerts, and notifications to Telegram chats and channels.
  - **Discord Node**: Send messages and rich embed cards via Discord Webhooks.
  - **Email / SMTP Node**: Transactional emails, HTML digests, and alert dispatches with sandbox simulation and custom SMTP support.
- **Bidirectional n8n Compatibility Adapter**: Export and import workflows seamlessly between AutoFlow AI and standard n8n JSON formats.
- **Embedded Database Architecture**: Powered by Node 24's native `node:sqlite` (`DatabaseSync`), requiring zero external database setup and zero native compiler toolchains.
- **Enterprise-Grade Security**: Credentials encrypted at rest using **AES-256-GCM** with unique initialization vectors (IV) and authentication tags.

---

## 📁 Architecture

```
autoflow-ai/
├── src/
│   ├── server.ts              # Express HTTP & SSE API server
│   ├── database/
│   │   ├── connection.ts      # Native SQLite connection in WAL mode
│   │   ├── migrations/        # Automated schema migrations
│   │   └── repositories/      # Repositories for workflows and executions
│   ├── engine/
│   │   ├── graph.ts           # Topological DAG validator and cycle detector
│   │   ├── context.ts         # Expression evaluator ({{ $json }}, {{ $node }})
│   │   ├── executor.ts        # Execution engine with branch isolation & retries
│   │   └── adapter.ts         # Bidirectional n8n workflow converter
│   ├── templates/
│   │   └── catalog.ts         # Production template catalog
│   ├── nodes/
│   │   ├── base.ts            # Node definition contracts
│   │   ├── registry.ts        # Dynamic node registry
│   │   ├── triggers/          # Manual, Webhook, Schedule triggers
│   │   ├── core/              # HTTP, IF Condition, Filter, Delay, Crypto, Code, Merge, Set
│   │   ├── apps/              # Telegram, Discord, Email / SMTP connectors
│   │   └── ai/                # Gemini Model client, Gemini Node, AI Agent Node
│   ├── credentials/
│   │   └── manager.ts         # AES-256-GCM encrypted credential storage
│   ├── webhooks/
│   │   └── manager.ts         # Webhook routing and event dispatcher
│   └── scheduler/
│       └── manager.ts         # Cron scheduler
├── public/                    # Frontend Visual Workflow Studio
│   ├── index.html             # UI with Canvas, Copilot, Templates & Fullscreen Runner
│   ├── css/styles.css         # Dark theme with glowing execution pulses
│   └── js/
│       ├── canvas.js          # Pan, zoom, node drag, bezier connection engine
│       ├── editor.js          # Node palette, inspector drawer, execution debug drawer
│       └── app.js             # SSE streaming, templates, simulator & auto-fix logic
├── Dockerfile                 # Multi-stage production Docker container
├── docker-compose.yml         # Container orchestration with SQLite volume mount
└── tests/
    ├── autoflow.test.js       # Core DAG, engine, encryption & app node tests
    └── server.test.js         # HTTP API, SSE streaming & webhook integration tests
```

---

## 🚀 Quick Start (Local & Termux)

### 1. Requirements
- Node.js 20+ (Node.js 24 recommended for native `node:sqlite`)
- npm 9+

### 2. Setup
```bash
git clone https://github.com/saminimbesat6-crypto/AutoFlow-AI-v2.git autoflow-ai
cd autoflow-ai
npm install
npm run build
```

### 3. Configure Environment
```bash
cp .env.example .env
```
Edit `.env` to configure your Gemini API key:
```env
PORT=3456
GEMINI_API_KEY=AIzaSy...
```

### 4. Run Tests
```bash
npm test
```
All 17 automated tests verify engine execution, DAG resolution, AES-256-GCM encryption, app dispatches, and SSE streaming.

### 5. Start Application
```bash
npm start
```
Open your browser at `http://localhost:3456`.

---

## 🐳 Docker Deployment

AutoFlow AI includes an optimized multi-stage `Dockerfile` and `docker-compose.yml` configured with persistent volume storage for SQLite.

### Run with Docker Compose
```bash
docker compose up -d --build
```

### Run with Docker CLI
```bash
docker build -t autoflow-ai:latest .
docker run -d \
  -p 3456:3456 \
  -v $(pwd)/data:/app/data \
  -e GEMINI_API_KEY="your-api-key" \
  --name autoflow \
  autoflow-ai:latest
```

The database is persisted in `./data/autoflow.sqlite` on the host machine.

---

## 💡 Using Key Capabilities

### 1. Real-Time Fullscreen Flowchart Execution
1. Open or build any workflow.
2. Click **"Fullscreen Run"** in the top navigation bar.
3. Watch the graph animate in real time: active nodes glow with neon borders, SVG connector lines pulse with glowing particles, and completed nodes transition to green checkmarks.

### 2. 1-Click AI Self-Healing & Auto-Fix
1. If a node fails during execution (e.g., incorrect API URL or bad parameters), open the Execution Drawer or inspect the failed node in Fullscreen mode.
2. Click **"⚡ Auto-Fix with Copilot"**.
3. Gemini 3.8 Flash will diagnose the issue and propose a corrected configuration.
4. Click **"Apply Fix & Re-run"** to patch the workflow and re-execute immediately.

### 3. Production Workflow Templates
1. Click **"Templates"** in the top navigation bar.
2. Browse categories: AI & ML, Alerts & ChatOps, Webhooks & APIs.
3. Click **"Use Template"** to watch the canvas automatically assemble the workflow in real time.

### 4. Webhook Payload Simulator
1. Click **"Simulate Webhook"** in the top navigation bar.
2. Type a scenario description (e.g., *"Customer bought 2 iPhones for $1800"*).
3. Click **"Generate Synthetic Payload"** to have Gemini draft realistic JSON data.
4. Click **"Dispatch & Execute Workflow"** to trigger execution instantly.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
