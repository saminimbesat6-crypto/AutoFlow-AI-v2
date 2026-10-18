import { DataItem, NodeOutput, WorkflowNode } from '../types/workflow';
import { CredentialsManager } from '../credentials/manager';
import { ExpressionSandbox } from './sandbox';

export interface NodeExecutionContext {
  node: WorkflowNode;
  inputData: DataItem[];
  getNodeParameter(paramName: string, itemIndex?: number, defaultValue?: any): any;
  getCredentials<T = Record<string, any>>(credentialType: string): T | null;
  evaluateExpression(expression: string, itemIndex?: number): any;
  getAllNodeData(nodeName: string): DataItem[] | null;
  itemIndex: number;
}

export class ExecutionContext {
  private nodeOutputs: Map<string, NodeOutput> = new Map();
  private credentialsManager: CredentialsManager;
  private workflowEnv: Record<string, string>;
  public workflowId?: string;
  public workflowName?: string;
  public executionId?: string;
  public executionMode?: string;

  constructor(credentialsManager?: CredentialsManager, env?: Record<string, string>) {
    this.credentialsManager = credentialsManager || new CredentialsManager();
    this.workflowEnv = env || (process.env as Record<string, string>);
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
    itemIndex = 0
  ): NodeExecutionContext {
    const self = this;

    return {
      node,
      inputData,
      itemIndex,

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
      nodeOutputs: this.nodeOutputs,
      workflowId: this.workflowId,
      workflowName: this.workflowName,
      executionId: this.executionId,
      executionMode: this.executionMode,
      env: this.workflowEnv
    });
  }
}
