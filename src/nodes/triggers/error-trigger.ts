import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class ErrorTriggerNode extends BaseNode {
  type = 'error-trigger';
  name = 'Error Trigger';
  description = 'Triggers an alert or recovery workflow whenever another workflow crashes with an unhandled exception';
  category = 'trigger' as const;
  icon = 'alert-triangle';
  color = '#ef4444'; // Red

  inputs: PortDefinition[] = [];
  outputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Output' }
  ];

  properties: PropertyDefinition[] = [
    {
      name: 'includeStackTrace',
      displayName: 'Include Stack Trace',
      type: 'boolean',
      default: true,
      description: 'Include detailed JavaScript error stack in execution output'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const input = context.inputData && context.inputData.length > 0
      ? context.inputData[0].json
      : {};

    const includeStackTrace = context.getNodeParameter('includeStackTrace', 0, true);

    const execution = input.execution || {
      id: `exec-${Date.now()}`,
      mode: 'manual',
      startedAt: new Date().toISOString()
    };

    const workflow = input.workflow || {
      id: 'unknown-wf',
      name: 'Failed Workflow'
    };

    const rawError = input.error || {};
    const errorInfo: Record<string, any> = {
      message: rawError.message || 'Workflow execution terminated with an error',
      node: rawError.node || 'Unknown Node',
      timestamp: new Date().toISOString()
    };

    if (includeStackTrace && rawError.stack) {
      errorInfo.stack = rawError.stack;
    }

    const result: DataItem = {
      json: {
        execution,
        workflow,
        error: errorInfo
      }
    };

    return [[result]];
  }
}
