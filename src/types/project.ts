import { Workflow, WorkflowNode, Connection, WorkflowSettings } from './workflow';

export interface Project {
  id: string;
  name: string;
  description?: string;
  labels: string[];
  settings: Record<string, any>;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectHealth {
  status: 'healthy' | 'warning' | 'error' | 'idle';
  successRate: number; // 0 - 100 percentage
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRunAt?: string;
}

export interface ProjectSummary extends Project {
  workflowCount: number;
  activeWorkflowCount: number;
  health: ProjectHealth;
  lastModified: string;
}

export interface ProjectExportWorkflow {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: Connection[];
  settings: WorkflowSettings;
  folderId?: string;
  tags?: string[];
}

export interface ProjectBundleManifest {
  schemaVersion: '2.0';
  exportedAt: string;
  generator: string;
  project: {
    name: string;
    description?: string;
    labels: string[];
    settings: Record<string, any>;
  };
  totalWorkflows: number;
  requiredCredentials: Array<{ type: string; name: string }>;
  nodeTypesUsed: string[];
}

export interface ProjectBundle {
  manifest: ProjectBundleManifest;
  project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'archived'> & { id?: string; archived?: boolean };
  workflows: ProjectExportWorkflow[];
}

export interface ImportValidationResult {
  valid: boolean;
  missingCredentials: Array<{ type: string; name: string }>;
  unsupportedNodes: string[];
  workflowCount: number;
  warnings: string[];
}
