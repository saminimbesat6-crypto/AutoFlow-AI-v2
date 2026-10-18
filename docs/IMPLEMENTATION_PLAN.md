# AutoFlow AI — Master Engineering Implementation Plan

This prioritized implementation plan details the sequenced engineering steps to achieve n8n-level feature parity.

---

## Stage 1: Universal Execution Engine Upgrades
- [ ] **Node-Level Error Routing**:
  - Add `onError?: 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput'` to `WorkflowNode`.
  - When `continueErrorOutput` is active, catch errors per item and route `{ json: { error: err.message, stack: err.stack, itemIndex } }` to Port 1 (Error Output handle).
- [ ] **Switch Node** (`src/nodes/core/switch.ts`):
  - Multi-rule routing (string, number, boolean, regex) with dynamic output ports (0..N-1) plus fallback port.
- [ ] **Loop Over Items / Split In Batches Node** (`src/nodes/core/loop.ts`):
  - Iterates over item arrays with configurable batch size.
  - Output 0: `loop` (current batch); Output 1: `done` (all processed batches).
  - Update `WorkflowGraph.validate()` to authorize verified loop backward edges pointing back to loop nodes.
- [ ] **Advanced Merge Node Modes** (`src/nodes/core/merge.ts`):
  - Support `append`, `chooseBranch`, `combine` (by key/index), and `wait` (synchronous barrier waiting for all input paths).
- [ ] **Wait & Durable Suspension** (`src/nodes/core/wait.ts`):
  - Duration delay (seconds/minutes/hours) and webhook resume with token generation (`/webhook/resume/:token`).
- [ ] **Global Error Workflows**:
  - `ErrorTriggerNode` (`src/nodes/triggers/error-trigger.ts`) receiving execution failure metadata.
  - Automatically invoke configured `workflow.settings.errorWorkflow` on fatal failure.
- [ ] **Sub-Workflow Execution** (`src/nodes/core/execute-workflow.ts`):
  - Sub-pipeline runner invoking workflows with isolated context and returning output data.

---

## Stage 2: Sandboxed Expression Engine & SSRF Protection
- [ ] **Secure Expression Evaluator** (`src/engine/sandbox.ts`):
  - Sandboxed JavaScript expression evaluation via `node:vm` without exposing `process`, `fs`, `child_process`.
  - Expose `$json`, `$binary`, `$itemIndex`, `$input`, `$node`, `$now`, `$execution`, and Luxon/standard helpers.
- [ ] **SSRF Defense Firewall** (`src/nodes/core/http-request.ts`):
  - Validate outbound request IP destinations against private subnets (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`).

---

## Stage 3: Binary File Handling
- [ ] **Binary Data Support**:
  - Add `binary?: Record<string, BinaryData>` to `DataItem`.
  - `ReadWriteFileNode` (`src/nodes/core/file.ts`): Read local files into Base64 binary items or write binary items to disk.
  - `ExtractFromFileNode` (`src/nodes/core/extract-file.ts`): Parse CSV, text, or JSON files into structured JSON items.

---

## Stage 4: Execution Management & Observability
- [ ] **Execution Retry & Replay**:
  - `POST /api/executions/:id/retry`: Re-execute workflow from scratch or from failed node.
  - `POST /api/executions/:id/cancel`: Cancel active/waiting execution.
  - `POST /api/executions/:id/resume`: Resume waiting execution.

---

## Stage 5: Visual Studio Redesign & UX Polish
- [ ] **Application Shell Navigation**:
  - Collapsible sidebar: Workflows, Executions, Credentials, Templates, Webhook Simulator, Settings.
  - Node Inspector Drawer: Error Handling controls (`onError`, `retryOnFail`, `maxTries`, `waitBetweenTries`, notes).
  - Canvas Enhancements: Multi-selection, copy/paste, auto-layout, keyboard shortcuts.

---

## Stage 6: Testing, Verification & GitHub Release
- [ ] Execute complete test suite covering all new nodes, engine semantics, loops, and error routing.
- [ ] Verify zero regressions on live daemon.
- [ ] Commit and push to `saminimbesat6-crypto/AutoFlow-AI-v2`.
