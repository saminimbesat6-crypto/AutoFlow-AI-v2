<div align="center">

# AutoFlow AI ⚡
### Production-Grade Visual Automation Platform with Antigravity Copilot & Full n8n Parity

[![CI Test Suite](https://img.shields.io/badge/tests-120%2F120%20passing-brightgreen?style=for-the-badge&logo=node.js&logoColor=white)]()
[![Integration Catalog](https://img.shields.io/badge/nodes-405%20active-blue?style=for-the-badge&logo=n8n&logoColor=white)]()
[![Zero-Dependency Database](https://img.shields.io/badge/database-native%20node%3Asqlite%20WAL-orange?style=for-the-badge&logo=sqlite&logoColor=white)]()
[![Multi-Project Workspaces](https://img.shields.io/badge/workspaces-isolated%20%7C%20PKZIP%20bundles-indigo?style=for-the-badge&logo=docker&logoColor=white)]()
[![Security: AES-256-GCM](https://img.shields.io/badge/vault-AES--256--GCM%20%7C%20OAuth2-red?style=for-the-badge&logo=auth0&logoColor=white)]()
[![AI Copilot](https://img.shields.io/badge/Copilot-Google%20Antigravity%20CLI%20%2B%20Gemini-purple?style=for-the-badge&logo=google&logoColor=white)]()
[![Mobile & Desktop](https://img.shields.io/badge/platform-Termux%20%7C%20Linux%20%7C%20Docker-black?style=for-the-badge&logo=linux&logoColor=white)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

<p align="center">
  <b>A lightweight, high-performance, self-hostable workflow automation engine achieving full n8n parity in pure TypeScript.</b><br>
  Multi-Project Isolation • Sub-150MB footprint • Live Antigravity SSE build streams • Zero-dependency PKZIP bundles
</p>

</div>

---

## 🌟 Executive Overview

**AutoFlow AI** is an original, production-ready visual workflow automation platform inspired by n8n. Engineered from first principles with zero external database dependencies, it leverages Node.js 24's native `DatabaseSync` (`node:sqlite`) in WAL mode to provide an enterprise-grade automation engine with sub-150MB memory footprint and microsecond local query latency.

Equipped with a **topological Directed Acyclic Graph (DAG) engine**, a **multi-project workspace isolation system**, a **405-node universal integration catalog**, an **AES-256-GCM encrypted credential vault**, and native **Google Antigravity CLI Copilot** with real-time observable build sessions, AutoFlow AI runs seamlessly across high-end cloud servers, Docker containers, and resource-constrained environments like Linux/Termux on mobile devices.

---

## ⚡ Core Platform Capabilities

### 1. 🏢 Multi-Project Workspace & Strict Isolation
- **Project Dashboard**: Create, rename, duplicate, archive, and delete project workspaces with dedicated search, sorting, and tag filters.
- **Strict Data Isolation**: Every workflow, execution record, and credential reference is scoped to its parent project (`projectId`). Switching projects cleanly re-scopes the canvas and execution logs without data leakage.
- **Project Health Metrics**: Real-time aggregate health metrics (success rate %, total execution runs, healthy / warning / error / idle status).
- **Versioned ZIP & JSON Bundles**: Full PKZIP export/import engine (`node:zlib` PKZIP with CRC32 verification and directory traversal protection). Exports all project workflows, manifest metadata, and settings with automatic secret redaction.

### 2. 🎨 High-Performance Visual Workflow Studio
- **Modern Canvas Engine**: Pure Vanilla JS, SVG, and CSS3 canvas with smooth 60 FPS cubic bezier connections, dynamic port snapping, infinite pan, zoom-to-fit, and bounding-box marquee multi-select (`Ctrl+A`, `Ctrl+D`, `Ctrl+Z`, `Ctrl+Y`).
- **Structured Parameter Forms**: Form-based configuration for all standard nodes (HTTP Request, Webhook, IF, Filter, Email, Slack, etc.) avoiding raw code views for non-code nodes.
- **Mobile-First Touch Architecture**: Native pinch-to-zoom, pan gestures, and responsive sliding drawers built and optimized for mobile devices and desktops alike.
- **Canvas Annotations**: Visual Markdown-capable `StickyNoteNode` with 7 color themes for documentation.

### 3. ⚡ Real-Time Fullscreen Flowchart Execution & Telemetry
- **Live SSE Streaming**: Step-by-step telemetry streamed from server to client via Server-Sent Events (`/api/workflows/:id/execute-stream`).
- **Dynamic Glow Transitions**: Nodes pulse with active neon rings during execution and transition smoothly to success (green) or failure (red).
- **Animated SVG Connector Pulses**: Visual execution particles flow through cubic bezier paths in real-time as data moves across the DAG.

### 4. 🪐 Google Antigravity CLI Copilot & Observable Build Stream
- **Primary Antigravity Copilot**: Seamlessly design, build, and connect workflow automation pipelines directly on canvas from conversational natural language prompts.
- **Google Account Authentication**: 1-click Sign-In with your Google Account syncing directly with local Antigravity CLI (`agy`) sessions or OAuth tokens. No API keys required for copilot workflow creation!
- **Observable Build Stream (`/api/ai/assistant/build-stream`)**: Streams live Server-Sent Events across 7 distinct lifecycle stages:
  1. `understanding`: Analyzes natural language intent and requirements.
  2. `planning`: Synthesizes graph topology, node sequence, and branching contracts.
  3. `adding_nodes`: Dynamically positions and places nodes on canvas in real-time.
  4. `connecting`: Reroutes wires and pulses bezier connections.
  5. `testing`: Automatically synthesizes realistic trigger payloads (`synthesizeSampleData`) and executes an in-memory test run.
  6. `repairing`: Automatically diagnoses node failures, synthesizes parameter patches, and re-tests in a bounded self-healing loop (up to 3 iterations).
  7. `complete`: Saves the production-verified workflow directly into the active project workspace.

### 5. 🛠️ Antigravity AI Self-Healing & 1-Click Auto-Fix
- **Automated Root-Cause Diagnosis**: When a workflow node fails at runtime (e.g. invalid URL, schema error, bad expression), Antigravity Copilot analyzes the runtime error and sample inputs.
- **1-Click Apply & Re-Run**: Synthesizes clean replacement parameters and fixes without manual intervention, allowing instant recovery in 1 click.

### 6. 🌐 Universal 405-Node Integration Catalog (Full n8n Parity)
- **41 Native Core & App Nodes**:
  - *Control Flow*: `IfConditionNode`, `SwitchNode`, `LoopNode` (batch processing), `MergeNode` (Append, Join by Key, Cartesian, Position), `WaitNode`, `ExecuteWorkflowNode` (sub-workflows).
  - *Data & Transformation*: `HttpRequestNode`, `SetDataNode`, `AggregateNode`, `DateTimeNode`, `FilterNode`, `CryptoNode` (HMAC, SHA-256, AES), `FileNode`, `StickyNoteNode`.
  - *Multi-Language Code*: `CodeNode` with isolated sandboxes for both **JavaScript** (`node:vm`) and **Python 3**.
  - *Native Apps*: PostgreSQL, Redis, AWS S3, Notion, OpenAI, GitHub, Stripe, Slack, Discord, Telegram, WhatsApp Business, Instagram for Business, Google Sheets, Airtable, Email/SMTP.
- **364 Declarative Integrations**: Dynamically mapped REST services across CRM, dev tools, cloud providers, and analytics.
- **Dynamic Custom Node SDK**: Drop new node manifests into `./custom-nodes` for automatic runtime compilation and palette registration.

### 7. 🔀 Dual Webhook Architecture (n8n Parity)
- **Production Mode** (`/webhook/:path`): High-throughput ingress endpoint for active production workflows.
- **Test Mode** (`/webhook-test/:path`): Real-time event listener that captures live inbound payloads and streams them directly into the canvas editor for interactive testing and debugging.

### 8. 🔒 Enterprise Security & Encrypted Credential Vault
- **AES-256-GCM Vault**: Secret values encrypted at rest with distinct initialization vectors (IV) and authentication tags.
- **RFC 6749 OAuth2 Engine**: Cryptographic state parameter verification, automated access token refresh, and pre-configured presets for Google, GitHub, Slack, Notion, and Microsoft.
- **SSRF Firewall Protection**: Native CIDR/subnet filtering in `HttpRequestNode` preventing requests to private networks, loopbacks, and cloud metadata endpoints (`169.254.169.254`).

### 9. 🗂️ Workflow Governance & Observability
- **Version History & Rollback**: Automatic version snapshotting on save, JSON diff calculation, and 1-click restore to any of the last 50 revisions.
- **Hierarchical Folders & Tagging**: Full workspace organization with multi-tag filtering.
- **Automated Log Pruning**: Configurable retention policies (`ExecutionRetentionManager`) with daily cleanup crons.
- **Queue Scaling & Priority**: Built-in `ExecutionQueueManager` with concurrency throttling and priority tiers (*urgent*, *high*, *normal*, *low*).
- **Bidirectional n8n Compatibility**: Import and export workflow schemas natively between AutoFlow AI and n8n formats.

---

## 📁 System Architecture

```
autoflow-ai/
├── src/
│   ├── server.ts                       # Express HTTP, SSE & webhook ingress server
│   ├── worker.ts                       # Standalone worker daemon for queued execution
│   ├── types/
│   │   ├── workflow.ts                 # Canonical workflow & node schemas
│   │   └── project.ts                  # Project models, health & bundle contracts
│   ├── utils/
│   │   └── zip.ts                      # Pure Node.js PKZIP writer & reader (CRC32, safe path)
│   ├── copilot/
│   │   └── antigravity-copilot.ts      # Antigravity CLI bridge, build stream & repair loop
│   ├── database/
│   │   ├── connection.ts               # Native SQLite DatabaseSync (WAL mode)
│   │   ├── migrations/                 # Automated schema migrations (Migrations 1 - 7)
│   │   └── repositories/               # Projects, workflows, versions, tags, executions
│   ├── engine/
│   │   ├── graph.ts                    # Topological DAG validator & cycle detector
│   │   ├── executor.ts                 # Workflow execution engine with branch isolation
│   │   ├── context.ts & sandbox.ts     # Sandboxed evaluator (JMESPath, DateTime, $json)
│   │   ├── retention-manager.ts        # Execution log pruning & retention manager
│   │   └── adapter.ts                  # Bidirectional n8n workflow converter
│   ├── credentials/
│   │   ├── manager.ts                  # AES-256-GCM encrypted credential vault
│   │   └── oauth2-manager.ts           # OAuth2 lifecycle & background token refresh
│   ├── scaling/
│   │   └── queue-manager.ts            # Priority queue & concurrency manager
│   ├── nodes/
│   │   ├── base.ts & registry.ts       # 405-node registry & contract interfaces
│   │   ├── declarative-node.ts         # Declarative manifest execution engine
│   │   ├── custom-loader.ts            # Dynamic custom node SDK loader
│   │   ├── core/                       # HTTP, IF, Switch, Loop, Merge, Code, Crypto
│   │   ├── triggers/                   # Webhook, Cron Schedule, Polling, Email
│   │   ├── apps/                       # WhatsApp, Instagram, Telegram, Slack, Sheets
│   │   ├── ai/                         # Gemini Model, Vision, AI Agent, OpenAI
│   │   └── integrations/               # 364 declarative integration manifests
│   ├── webhooks/manager.ts             # Dual webhook router (production vs test)
│   ├── scheduler/manager.ts            # Cron scheduler & polling manager
│   └── templates/catalog.ts            # 8 curated production workflow templates
├── public/                             # High-Performance Visual Workflow Studio
│   ├── index.html                      # Studio canvas, project workspace & copilot UI
│   ├── css/styles.css                  # Dark theme with glowing execution pulses
│   └── js/
│       ├── canvas.js                   # Bezier engine, pan/zoom & touch gestures
│       ├── editor.js                   # Node inspector, expression helper & palette
│       └── app.js                      # Multi-project UI, build stream & AI auto-fix
├── tests/                              # 19 test suites (120 automated tests)
├── Dockerfile                          # Multi-stage production container build
└── docker-compose.yml                  # Container orchestration with volume persist
```

---

## 🧪 Verification & Test Suite

AutoFlow AI includes an automated test suite containing **120 tests across 19 test suites** with 100% pass rate:

```text
✔ AutoFlow AI Antigravity Copilot & Google Sign-In Suite (6 tests)
✔ AutoFlow AI Antigravity Copilot Live Build Stream & Test-Repair Loop Suite (4 tests)
✔ AutoFlow AI Multi-Project Workspace & Isolation Suite (8 tests)
✔ AutoFlow AI Core Engine, DAG & Encryption Suite (17 tests)
✔ AutoFlow AI Full n8n Capability Parity Suite (5 tests)
✔ AutoFlow AI Full Node Catalog (405 Nodes) Audit Suite (7 tests)
✔ AutoFlow AI OAuth2 Engine & Token Refresh Suite (6 tests)
✔ AutoFlow AI Dual Webhook Mode (Test vs Production) Suite (4 tests)
✔ AutoFlow AI Multi-Language Python 3 & JS Code Engine Suite (5 tests)
✔ AutoFlow AI Polling Triggers & Deduplication State Suite (6 tests)
✔ AutoFlow AI Production Worker Scaling & Queue Suite (4 tests)
✔ AutoFlow AI Data Merge & Sub-Workflow Suite (5 tests)
✔ AutoFlow AI Frontend Editor & Mobile Touch Suite (9 tests)
✔ AutoFlow AI Credential Connection Validator Suite (4 tests)
✔ AutoFlow AI HTTP API Integration Suite (7 tests)
✔ AutoFlow AI Declarative Integrations Engine Suite (5 tests)
✔ AutoFlow AI Integration Ecosystem & Apps Suite (9 tests)
✔ AutoFlow AI PinData & Developer Bench Suite (4 tests)
✔ AutoFlow AI Smart News Analyzer Gemini Suite (5 tests)

ℹ tests 120 | suites 19 | pass 120 | fail 0 | 100% passing
```

Run tests locally:
```bash
npm test
```

---

## 🚀 Quick Start (Local, Termux & Cloud)

### 1. Prerequisites
- **Node.js 20+** (Node.js 24 recommended for native `node:sqlite`)
- **npm 9+**
- *(Optional)* **Python 3** (if executing Python scripts inside `CodeNode`)
- *(Optional)* **Google Antigravity CLI** (`agy`) for primary Copilot natural language workflow generation

### 2. Installation & Build
```bash
# Clone the repository
git clone https://github.com/saminimbesat6-crypto/AutoFlow-AI-v2.git autoflow-ai
cd autoflow-ai

# Install dependencies and compile TypeScript
npm install
npm run build
```

### 3. Environment Configuration
```bash
cp .env.example .env
```

Configure your `.env`:
```env
PORT=3456
DATABASE_PATH=./data/autoflow.sqlite
ENCRYPTION_KEY=your-32-byte-secret-encryption-key!
WEBHOOK_BASE_URL=http://localhost:3456
GEMINI_API_KEY=your-gemini-api-key-here
```

### 4. Start Server
```bash
npm start
```
Open your browser at **`http://localhost:3456`**.

---

## 🐳 Docker Deployment

Run with persistent SQLite storage:
```bash
docker compose up -d --build
```

Or via Docker CLI:
```bash
docker run -d \
  -p 3456:3456 \
  -v $(pwd)/data:/app/data \
  -e GEMINI_API_KEY="your-gemini-api-key" \
  --name autoflow-ai \
  autoflow-ai:latest
```

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
