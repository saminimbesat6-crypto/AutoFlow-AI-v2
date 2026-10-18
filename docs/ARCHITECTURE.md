# AutoFlow AI — Architecture Specification

## 1. System Overview

```
                      ┌───────────────────────────────────────────────┐
                      │         Visual Studio Web Application         │
                      │  (Canvas, Inspector, Debugger, Flowchart UI)  │
                      └───────────────────────┬───────────────────────┘
                                              │ HTTP / SSE
                                              ▼
                      ┌───────────────────────────────────────────────┐
                      │              Express API Server               │
                      │  - /api/workflows        - /api/executions    │
                      │  - /api/credentials      - /api/node-types    │
                      │  - /api/templates        - /api/ai/assistant  │
                      │  - /webhook/:path        - /webhook/resume/:t │
                      └───────┬───────────────────────────────┬───────┘
                              │                               │
              ┌───────────────▼──────────────┐ ┌──────────────▼──────────────┐
              │  Universal Execution Engine  │ │      Credential Vault       │
              │  - Graph & DAG Validation    │ │  - AES-256-GCM Encryption   │
              │  - Expression Sandboxing     │ │  - Scoped Decryption        │
              │  - Branching, Loops, Merges  │ └─────────────────────────────┘
              │  - Error Output & Retries    │
              │  - Durable Pause & Resume    │
              └───────────────┬──────────────┘
                              │
              ┌───────────────▼──────────────┐
              │     SQLite Persistence       │
              │  - workflows                 │
              │  - executions & node traces  │
              │  - credentials (encrypted)   │
              │  - resume_tokens             │
              └──────────────────────────────┘
```

## 2. Core Components

### 2.1 Workflow Graph & Engine (`src/engine/`)
- `graph.ts`: Directed graph representation of nodes and port connections. Computes topological execution order, detects non-terminating cycles, identifies supported loops (`LoopNode`), and indexes incoming/outgoing edges per port.
- `context.ts`: Encapsulates runtime context during node execution. Evaluates expressions (`{{ ... }}`) safely in isolated context, resolves item data and node references (`$node["Name"]`, `$('Name')`, `$json`, `$binary`, `$now`, `$execution`).
- `executor.ts`: Universal workflow runner. Executes nodes sequentially or concurrently along branch paths, tracks execution state per node, handles retries with backoff, routes errors to Output Port 1 (`continueErrorOutput`), triggers global error workflows, and handles durable execution suspension.
- `adapter.ts`: Bidirectional converter between AutoFlow canonical workflow schema and standard n8n JSON formats.

### 2.2 Node Architecture (`src/nodes/`)
- `base.ts`: Abstract `BaseNode` interface with standardized metadata (`type`, `name`, `description`, `category`, `color`, `icon`, `inputs`, `outputs`, `properties`, and `execute(context)`).
- `registry.ts`: Singleton registry managing all available node definitions. Exposed to the visual editor, validator, and AI Copilot.
- `triggers/`: `ManualTriggerNode`, `WebhookTriggerNode`, `ScheduleTriggerNode`, `EmailTriggerNode`, `ErrorTriggerNode`.
- `core/`: `HttpRequestNode` (with SSRF firewall), `IfConditionNode`, `SwitchNode`, `LoopNode`, `FilterNode`, `DelayNode`, `WaitNode`, `SetDataNode`, `MergeNode`, `CodeNode`, `CryptoNode`, `WebhookResponseNode`, `ExecuteWorkflowNode`, `ReadWriteFileNode`.
- `apps/`: `WhatsAppNode`, `InstagramNode`, `TelegramNode`, `DiscordNode`, `SlackNode`, `GoogleSheetsNode`, `AirtableNode`, `GitHubNode`, `StripeNode`, `EmailNode`.
- `ai/`: `GeminiClient` (Google Generative Language REST API), `GeminiNode` (Multi-Modal Vision, OCR, JSON output), `AiAgentNode` (Autonomous multi-turn tool calling loop).

### 2.3 Persistence Layer (`src/database/`)
- Built on Node 24 native `node:sqlite` (`DatabaseSync`) in Write-Ahead Logging (WAL) mode for high-concurrency read/write throughput without C++ compiler toolchains.
- Tables:
  - `workflows`: id, name, description, nodes, connections, settings, active, created_at, updated_at.
  - `executions`: id, workflow_id, workflow_name, mode, status, started_at, finished_at, duration, error_message, data.
  - `execution_nodes`: id, execution_id, node_id, node_name, node_type, status, input_data, output_data, error, started_at, finished_at, duration.
  - `credentials`: id, name, type, encrypted_data, iv, auth_tag, created_at, updated_at.
  - `resume_tokens`: token, execution_id, node_id, expires_at, created_at.
