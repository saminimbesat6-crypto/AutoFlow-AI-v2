export type PortType = 'main' | 'ai' | 'tool';

export interface PortDefinition {
  name: string;
  type: PortType;
  label?: string;
}

export interface PropertyDefinition {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'options' | 'json' | 'code' | 'credential' | 'collection';
  default?: any;
  description?: string;
  placeholder?: string;
  options?: Array<{ name: string; value: any; description?: string }>;
  credentialType?: string;
  required?: boolean;
}

export interface NodePosition {
  x: number;
  y: number;
}

export type NodeOnError = 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput';

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  position: NodePosition;
  parameters: Record<string, any>;
  credentials?: Record<string, string>; // credentialType -> credentialId
  disabled?: boolean;
  notes?: string;
  continueOnFail?: boolean;
  onError?: NodeOnError;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
  pinnedData?: DataItem[];
}

export interface Connection {
  source: string;       // source node name or ID
  sourceOutput: number; // output index (0, 1, ...)
  target: string;       // target node name or ID
  targetInput: number;  // input index
  type?: PortType;      // defaults to 'main'
}

export interface WorkflowSettings {
  executionTimeout?: number; // seconds
  saveExecutionProgress?: boolean;
  saveManualExecutions?: boolean;
  timezone?: string;
  errorWorkflow?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  projectId?: string;
  folderId?: string;
  tags?: string[];
  nodes: WorkflowNode[];
  connections: Connection[];
  settings: WorkflowSettings;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  versionNum: number;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  settings: WorkflowSettings;
  createdAt: string;
}

export interface WorkflowTag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowFolder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BinaryData {
  data: string; // base64
  mimeType: string;
  fileName?: string;
  fileExtension?: string;
  fileSize?: number;
}

export interface DataItem {
  json: Record<string, any>;
  binary?: Record<string, BinaryData>;
  pairedItem?: number | { item: number };
}

export type NodeOutput = DataItem[][]; // array of outputs (for branching: output[0] = true branch, output[1] = false branch)

export type ExecutionMode = 'manual' | 'webhook' | 'schedule' | 'poll' | 'test' | 'error' | 'subworkflow';
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'waiting' | 'cancelled';

export interface ExecutionRecord {
  id: string;
  workflowId: string;
  workflowName: string;
  projectId?: string;
  mode: ExecutionMode;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  errorMessage?: string;
  data?: Record<string, any>;
}

export interface NodeExecutionRecord {
  id: string;
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'waiting' | 'running' | 'success' | 'error' | 'skipped';
  inputData?: DataItem[];
  outputData?: NodeOutput;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
}
