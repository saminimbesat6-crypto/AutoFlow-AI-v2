# AutoFlow AI — Product Requirements Document (PRD)

## 1. Executive Summary & Vision
AutoFlow AI is an enterprise-grade, self-hostable workflow automation platform designed to achieve full functional parity with n8n while maintaining an independent, clean-room TypeScript architecture, an embedded zero-config SQLite persistence layer, native multi-modal Google Gemini AI orchestration, and an original visual workflow studio.

## 2. Core Pillars & Scope

### 2.1 Universal Workflow Execution Engine
- **Graph Topology & Validation**: Deterministic DAG validation, cycle detection with authorized loop construct support, and topological resolution.
- **Data Model**: Standard item-based array `DataItem[]` with structured `json` objects, `binary` data dictionaries (Base64 + MIME + filename), and `pairedItem` provenance metadata.
- **Branching & Routing**: Multi-output nodes (e.g. `IfConditionNode` True/False, `SwitchNode` Rule 1..N + Fallback).
- **Merge Strategies**: `append` (sequential list concat), `chooseBranch` (conditional passthrough), `combine` (field or index matching), and `wait` (synchronous barrier waiting for all incoming paths to complete).
- **Looping & Batching**: `Loop Over Items` / `Split In Batches` allowing micro-batch processing across large datasets with dedicated loop and done output handles.
- **Wait & Durable Suspension**: `WaitNode` supporting fixed time delays, scheduled dates, and durable webhook callbacks (`$execution.resumeUrl` and `/webhook/resume/:token`).
- **Error Handling & Resilience**:
  - Node-level `onError`: `'stopWorkflow'` (halt & bubble), `'continueRegularOutput'` (absorb error), `'continueErrorOutput'` (route failed item to dedicated Error Output handle).
  - Node-level retries: `retryOnFail`, `maxTries`, `waitBetweenTries` with exponential backoff.
  - Global Error Workflows: Triggered via `ErrorTriggerNode` on fatal unhandled execution exceptions.
- **Sub-Workflows**: Reusable sub-pipeline invocation via `ExecuteWorkflowNode`.

### 2.2 Data Expressions & Transformation
- **Syntax**: `{{ $json.field }}`, `{{ $('NodeName').item.json.field }}`, `{{ $('NodeName').all() }}`, `{{ $binary.dataKey }}`, `{{ $now }}`, `{{ $execution.id }}`.
- **Sandboxed Evaluation**: Sandboxed JavaScript execution protecting the host process against memory leaks, infinite loops, and prototype pollution.
- **Type Safety & Helpers**: Mathematical operations, date/time formatting, string manipulation, and JSON extraction.

### 2.3 Integration & Node Ecosystem
- **Core Action Nodes**: HTTP Request (with SSRF protection & pagination), IF Condition, Switch, Filter, Delay/Wait, Set Data (Edit Fields), Merge, Code (Sandboxed JavaScript), Crypto (HMAC, hashing, encryption), Webhook Response.
- **Triggers**: Manual Trigger, Dynamic Webhook Trigger, Schedule Trigger (Cron/Interval), Inbound Email Trigger, Error Trigger.
- **App & Social Connectors**: WhatsApp Business (Cloud API), Instagram for Business, Telegram Bot, Discord Webhook, Slack Webhook/API, Google Sheets, Airtable, GitHub, Stripe, Email/SMTP.
- **AI & Copilot**: Google Gemini Node (Multi-Modal Vision & JSON formatting), AI Agent Node (multi-turn function-calling tools loop), AI Self-Healing Auto-Fix.

### 2.4 Security Model
- Encrypted secrets using **AES-256-GCM** with per-record initialization vectors (IVs) and authentication tags.
- Strict SSRF defenses blocking private/internal subnets (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`).
- Strict secret redaction in logs, execution details, and SSE events.

### 2.5 Visual Workflow Studio & Observability
- Canvas with drag-and-drop, port snapping, bezier connections, pan/zoom, minimap, undo/redo, auto-layout.
- Real-time animated SSE flowchart execution with visual node status transitions (running ➔ success/error).
- Execution history browser with input/output inspections, runtime logs, execution retry, and cancellation.
