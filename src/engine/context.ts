import { DataItem, NodeOutput, WorkflowNode } from '../types/workflow';
import { CredentialsManager } from '../credentials/manager';
import { OAuth2Manager } from '../credentials/oauth2-manager';
import { StaticDataManager } from './static-data-manager';
import { ExpressionSandbox } from './sandbox';

export interface NodeExecutionContext {
  node: WorkflowNode;
  inputData: DataItem[];
  inputsByPort?: DataItem[][];
  getInputData(inputIndex?: number): DataItem[];
  getNodeParameter(paramName: string, itemIndex?: number, defaultValue?: any): any;
  getCredentials<T = Record<string, any>>(credentialType: string): T | null;
  getOAuth2Token(credentialType?: string): Promise<string | null>;
  getWorkflowStaticData(type?: 'node' | 'global'): Record<string, any>;
  evaluateExpression(expression: string, itemIndex?: number): any;
  getAllNodeData(nodeName: string): DataItem[] | null;
  itemIndex: number;
}

export class ExecutionContext {
  private nodeOutputs: Map<string, NodeOutput> = new Map();
  private credentialsManager: CredentialsManager;
  public oauth2Manager: OAuth2Manager;
  public staticDataManager: StaticDataManager;
  private workflowEnv: Record<string, string>;
  public workflowId?: string;
  public workflowName?: string;
  public executionId?: string;
  public executionMode?: string;

  constructor(
    credentialsManager?: CredentialsManager,
    env?: Record<string, string>,
    staticDataManager?: StaticDataManager,
    oauth2Manager?: OAuth2Manager
  ) {
    this.credentialsManager = credentialsManager || new CredentialsManager();
    this.workflowEnv = env || (process.env as Record<string, string>);
    this.staticDataManager = staticDataManager || new StaticDataManager();
    this.oauth2Manager = oauth2Manager || new OAuth2Manager(undefined, this.credentialsManager);
  }

  setNodeOutput(nodeNameOrId: string, output: NodeOutput): void {
    this.nodeOutputs.set(nodeNameOrId, output);
  }

  getNodeOutput(nodeNameOrId: string): NodeOutput | undefined {
    return this.nodeOutputs.get(nodeNameOrId);
  }

  getNodeMainData(nodeNameOrId: string): DataItem[] | null {
    const out = this.nodeOutputs.get(nodeNameOrId);
    if (out && out.length > 0 && out[0]) {
      return out[0];
    }
    return null;
  }

  getAllOutputs(): Map<string, NodeOutput> {
    return this.nodeOutputs;
  }

  createNodeContext(
    node: WorkflowNode,
    inputData: DataItem[],
    itemIndex = 0,
    inputsByPort: DataItem[][] = []
  ): NodeExecutionContext {
    const self = this;

    return {
      node,
      inputData,
      itemIndex,
      inputsByPort,

      getInputData(inputIndex = 0): DataItem[] {
        if (inputsByPort && inputsByPort[inputIndex] !== undefined && inputsByPort[inputIndex].length > 0) {
          return inputsByPort[inputIndex];
        }
        return inputData;
      },

      getNodeParameter(paramName: string, index = itemIndex, defaultValue = undefined) {
        const rawValue = node.parameters?.[paramName];
        if (rawValue === undefined) return defaultValue;

        if (typeof rawValue === 'string' && rawValue.includes('{{') && rawValue.includes('}}')) {
          return self.evaluateExpression(rawValue, inputData, index, self);
        }
        return rawValue;
      },

      getCredentials<T = Record<string, any>>(credentialType: string): T | null {
        const credId = node.credentials?.[credentialType];
        if (!credId) return null;
        const cred = self.credentialsManager.get(credId, true);
        return (cred?.data as T) || null;
      },

      async getOAuth2Token(credentialType = 'oauth2'): Promise<string | null> {
        let credId = node.credentials?.[credentialType];
        if (!credId && node.credentials) {
          // Look for any credential assigned that matches oauth2 or ends with oauth2
          for (const [key, id] of Object.entries(node.credentials)) {
            if (key.toLowerCase().includes('oauth') || key === 'oauth2') {
              credId = id;
              break;
            }
          }
        }
        if (!credId) return null;
        try {
          return await self.oauth2Manager.getValidAccessToken(credId);
        } catch (err) {
          console.error(`[ExecutionContext] Failed to get OAuth2 token for ${credId}:`, err);
          throw err;
        }
      },

      getWorkflowStaticData(type: 'node' | 'global' = 'node'): Record<string, any> {
        const wfId = self.workflowId || 'transient-execution';
        const nodeId = type === 'node' ? node.id : '__global__';
        return self.staticDataManager.getStaticData(wfId, nodeId);
      },

      evaluateExpression(expr: string, index = itemIndex): any {
        return self.evaluateExpression(expr, inputData, index, self);
      },

      getAllNodeData(nodeName: string): DataItem[] | null {
        return self.getNodeMainData(nodeName);
      }
    };
  }

  evaluateExpression(
    expr: string,
    currentItems: DataItem[],
    itemIndex: number,
    context: ExecutionContext
  ): any {
    if (typeof expr !== 'string') return expr;

    const currentItem = currentItems[itemIndex] || currentItems[0] || { json: {} };

    return ExpressionSandbox.interpolate(expr, {
      itemData: currentItem,
      itemIndex,
      allInputData: currentItems,
      nodeOutputs: this.nodeOutputs as any,
      workflowId: this.workflowId,
      workflowName: this.workflowName,
      executionId: this.executionId,
      executionMode: this.executionMode,
      env: this.workflowEnv,
      staticData: this.staticDataManager.getStaticData(this.workflowId || 'transient-execution', '__global__')
    });
  }
}
