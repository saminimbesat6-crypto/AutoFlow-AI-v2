# AutoFlow AI — n8n Feature Parity Matrix

This document benchmarks AutoFlow AI's capabilities against n8n's public functional specifications.

| Capability Category | n8n Reference Feature | AutoFlow AI Equivalent | Status | Verification / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **Workflow Graph** | Directed Acyclic Graph (DAG) | `WorkflowGraph` (`src/engine/graph.ts`) | **Implemented** | Unit tests in `tests/autoflow.test.js` |
| **Workflow Graph** | Visual Port Snapping & Dragging | `WorkflowCanvas` (`public/js/canvas.js`) | **Implemented** | Interactive Canvas UI |
| **Workflow Graph** | Supported Loops (`Split In Batches`) | `LoopNode` + Supported cycle logic (`src/nodes/core/loop.ts`) | **Implemented** | Test 13 in `tests/autoflow.test.js` |
| **Control Flow** | IF / Conditional Branching | `IfConditionNode` (True/False ports) | **Implemented** | Unit test 6 in `autoflow.test.js` |
| **Control Flow** | Switch Node (Multi-Rule Routing) | `SwitchNode` (N-Rules + Fallback) | **Implemented** | Test 12 in `tests/autoflow.test.js` |
| **Control Flow** | Merge Modes (Append, Combine, Wait) | `MergeNode` (Append, Combine, Choose, Wait) | **Implemented** | Verified in `tests/autoflow.test.js` |
| **Control Flow** | Wait / Pause & Resume | `WaitNode` & Webhook Resume Token | **Implemented** | Test 14 in `tests/autoflow.test.js` |
| **Control Flow** | Sub-Workflows (`Execute Sub-Workflow`)| `ExecuteWorkflowNode` | **Implemented** | Registered in `src/nodes/registry.ts` |
| **Error Handling** | Node On Error (`stopWorkflow`) | Default error halting | **Implemented** | Verified in tests |
| **Error Handling** | Node On Error (`continueRegularOutput`)| `node.continueOnFail` parameter | **Implemented** | Verified in tests |
| **Error Handling** | Node On Error (`continueErrorOutput`)| Routing failed item to Port 1 | **Implemented** | Test 16 in `tests/autoflow.test.js` |
| **Error Handling** | Global Error Workflow (`Error Trigger`)| `ErrorTriggerNode` & `settings.errorWorkflow` | **Implemented** | Registered & wired in executor |
| **Error Handling** | Node Retries with Backoff | `retryOnFail`, `maxTries`, `waitBetweenTries`| **Implemented** | Built into `WorkflowExecutor` |
| **Data Engine** | Array of Objects (`DataItem[]`) | `[{ json: {...}, binary: {...} }]` | **Implemented** | Canonical engine schema |
| **Data Engine** | Expression Syntax (`{{ $json.foo }}`) | `context.evaluateExpression()` | **Implemented** | Unit test 3 in `autoflow.test.js` |
| **Data Engine** | Upstream Node Access (`$('Node').item`) | `$('Node')` and `$node["Node"]` | **Implemented** | Interpolation engine |
| **Data Engine** | Sandboxed JavaScript Expression Eval | `ExpressionSandbox` (`node:vm` isolated context)| **Implemented** | Test 17 in `tests/autoflow.test.js` |
| **Data Engine** | Binary File Data Handling | `ReadWriteFileNode` & `ExtractFromFileNode` | **Implemented** | Test 15 in `tests/autoflow.test.js` |
| **Triggers** | Manual Trigger | `ManualTriggerNode` | **Implemented** | Core test suite |
| **Triggers** | Webhook Trigger (GET/POST/PUT/DELETE)| `WebhookTriggerNode` (`/webhook/:path`) | **Implemented** | Integration tests in `server.test.js`|
| **Triggers** | Schedule Trigger (Cron/Interval) | `ScheduleTriggerNode` & Cron manager | **Implemented** | Registered in palette |
| **Triggers** | Inbound Email Trigger | `EmailTriggerNode` | **Implemented** | Unit test 11 in `autoflow.test.js` |
| **Triggers** | Error Trigger (Failure Listener) | `ErrorTriggerNode` (`src/nodes/triggers/error-trigger.ts`)| **Implemented** | Registered in palette |
| **Security** | Encrypted Credential Vault | AES-256-GCM Credential Manager | **Implemented** | Unit test 1 in `autoflow.test.js` |
| **Security** | SSRF Firewall for Outbound Requests| Subnet & private IP blocking in `HttpRequestNode` | **Implemented** | Verified in `src/nodes/core/http-request.ts` |
| **Apps & Social** | Telegram Bot | `TelegramNode` | **Implemented** | Tested in `autoflow.test.js` |
| **Apps & Social** | Discord Webhook & Embeds | `DiscordNode` | **Implemented** | Tested in `autoflow.test.js` |
| **Apps & Social** | Email / SMTP Dispatch | `EmailNode` | **Implemented** | Tested in `autoflow.test.js` |
| **Apps & Social** | WhatsApp Business Cloud API | `WhatsAppNode` | **Implemented** | Tested in `autoflow.test.js` |
| **Apps & Social** | Instagram for Business | `InstagramNode` | **Implemented** | Tested in `autoflow.test.js` |
| **Apps & Social** | Slack Webhook & Block Kit | `SlackNode` | **Implemented** | Tested in `autoflow.test.js` |
| **Apps & Social** | Google Sheets | `GoogleSheetsNode` | **Implemented** | Tested in `autoflow.test.js` |
| **Apps & Social** | Airtable | `AirtableNode` | **Implemented** | Tested in `autoflow.test.js` |
| **Apps & Social** | GitHub | `GitHubNode` | **Implemented** | Tested in `autoflow.test.js` |
| **Apps & Social** | Stripe Payments & Billing | `StripeNode` | **Implemented** | Tested in `autoflow.test.js` |
| **AI Systems** | Google Gemini Generative Models | `GeminiNode` (Flash, Pro, JSON mode) | **Implemented** | Tested in `autoflow.test.js` |
| **AI Systems** | Multi-Modal Vision & Document OCR | `GeminiNode` (JPEG, PNG, PDF OCR) | **Implemented** | Multi-modal tests verified |
| **AI Systems** | Autonomous Agent with Tool Loop | `AiAgentNode` | **Implemented** | Calculator & workflow info tools |
| **AI Systems** | AI Self-Healing & 1-Click Auto-Fix| Copilot error root-cause diagnosis | **Implemented** | `/api/ai/assistant/auto-fix` |
| **Canvas & UX** | Canvas Sticky Notes & Annotations | `StickyNoteNode` (`src/nodes/core/sticky-note.ts`), 7 color themes, bidirectional n8n mapping | **Implemented** | Verified in `tests/autoflow.test.js` |
| **Canvas & UX** | Canvas Undo / Redo & Multi-Select | `WorkflowCanvas` (`undoStack`, `redoStack`, `selectedNodeIds`, Shift+Drag marquee, `Ctrl+Z`, `Ctrl+Y`, `Ctrl+D`) | **Implemented** | Verified in `public/js/canvas.js` |
| **Webhooks** | Dual Webhook Architecture | Test URL (`/webhook-test/:path`) vs Production URL (`/webhook/:path`) with real-time test listener & cancellation | **Implemented** | 4/4 tests in `tests/webhook-test-mode.test.js` |
| **Code Node** | Python 3 Language Execution | `CodeNode` with `language: 'python' | 'javaScript'`, `_items`, `_input`, `$json` | **Implemented** | 5/5 tests in `tests/code-python.test.js` |
| **Credentials** | Credential Test Connection Validator | `POST /api/credentials/test` & `POST /api/credentials/:id/test` with HTTP probing & credential isolation | **Implemented** | 4/4 tests in `tests/credential-test-validator.test.js` |
| **Versioning** | Workflow Version History & Rollback | `workflow_versions` table, auto-snapshotting on save, 50-version retention, diff calculation, 1-click restore | **Implemented** | Unit tests in `tests/n8n-full-parity-suite.test.js` |
| **Organization**| Workflow Folders & Tagging System | `workflow_folders`, `workflow_tags`, `workflow_tag_mappings`, filter by folder and tags in dashboard | **Implemented** | Unit tests in `tests/n8n-full-parity-suite.test.js` |
| **Expressions** | JMESPath & Advanced Expression Helpers | `$jmespath()`, `$now.plus()`, `$now.minus()`, `$now.format()`, `$today`, `$slug()`, `$hash()`, `$base64Encode()` | **Implemented** | Unit tests in `tests/n8n-full-parity-suite.test.js` |
| **Maintenance** | Execution Log Pruning & Retention | `ExecutionRetentionManager`, daily automated 02:00 AM cron, `POST /api/executions/prune`, settings config | **Implemented** | Unit tests in `tests/n8n-full-parity-suite.test.js` |
| **Ecosystem** | 405 Nodes Universal Registry | 41 Native Nodes + 364 Declarative Integrations + Dynamic SDK loader, 100% schema compliance | **Implemented** | 7/7 tests in `tests/node-catalog-audit.test.js` |
| **Templates** | 1-Click Workflow Template Catalog | 8 production blueprints with auto-build | **Implemented** | `/api/templates` & modal UI |
| **Observability** | Execution Traces & Debug Inspector | `executions` & `execution_nodes` | **Implemented** | Full node debug panel |
| **Observability** | Real-Time Animated Flowchart Execution | SSE pulse streaming (`node_start`, `node_finish`) | **Implemented** | Fullscreen SVG flowchart runner |
| **Portability** | Bidirectional n8n Import / Export | `WorkflowAdapter` | **Implemented** | Test 4 in `autoflow.test.js` |
| **Deployment** | Multi-Stage Docker & Compose | `Dockerfile` & `docker-compose.yml` | **Implemented** | Production container build |

