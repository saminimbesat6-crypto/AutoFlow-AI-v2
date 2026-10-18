import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export interface SwitchRule {
  field: string;
  operation: 'equals' | 'notEquals' | 'contains' | 'larger' | 'smaller' | 'regex' | 'isEmpty' | 'isNotEmpty';
  value?: any;
  outputIndex: number;
}

export class SwitchNode extends BaseNode {
  type = 'switch';
  name = 'Switch';
  description = 'Routes data items across multiple distinct outputs based on conditional rules or expression indices';
  category = 'core' as const;
  icon = 'git-pull-request';
  color = '#6366f1'; // Indigo

  inputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Input' }
  ];

  outputs: PortDefinition[] = [
    { name: 'output_0', type: 'main', label: 'Output 0' },
    { name: 'output_1', type: 'main', label: 'Output 1' },
    { name: 'output_2', type: 'main', label: 'Output 2' },
    { name: 'fallback', type: 'main', label: 'Fallback' }
  ];

  properties: PropertyDefinition[] = [
    {
      name: 'mode',
      displayName: 'Routing Mode',
      type: 'options',
      default: 'rules',
      options: [
        { name: 'Condition Rules', value: 'rules', description: 'Match items against multiple configured rules' },
        { name: 'Numeric Index Expression', value: 'expression', description: 'Evaluate expression that returns output port index (0, 1, 2...)' }
      ]
    },
    {
      name: 'rules',
      displayName: 'Routing Rules (JSON Array)',
      type: 'json',
      default: '[\n  {\n    "field": "{{ $json.role }}",\n    "operation": "equals",\n    "value": "admin",\n    "outputIndex": 0\n  },\n  {\n    "field": "{{ $json.role }}",\n    "operation": "equals",\n    "value": "editor",\n    "outputIndex": 1\n  }\n]',
      description: 'List of rule objects containing field, operation, value, and outputIndex'
    },
    {
      name: 'outputIndexExpression',
      displayName: 'Output Index Expression',
      type: 'string',
      description: 'Expression that returns the target output port number: e.g. {{ $json.tier === "enterprise" ? 0 : 1 }}'
    },
    {
      name: 'fallbackOutput',
      displayName: 'Fallback Output Index',
      type: 'number',
      default: 3,
      description: 'Output port index to route items that do not match any rules'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [];

    const portCount = Math.max(4, this.outputs.length);
    const results: DataItem[][] = Array.from({ length: portCount }, () => []);

    const mode = context.getNodeParameter('mode', 0, 'rules');
    const fallbackOutput = Number(context.getNodeParameter('fallbackOutput', 0, 3));

    let parsedRules: SwitchRule[] = [];
    if (mode === 'rules') {
      const rawRules = context.getNodeParameter('rules', 0, []);
      try {
        parsedRules = typeof rawRules === 'string' ? JSON.parse(rawRules) : rawRules;
        if (!Array.isArray(parsedRules)) parsedRules = [];
      } catch {
        parsedRules = [];
      }
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let routedPort = -1;

      if (mode === 'expression') {
        const exprValue = context.getNodeParameter('outputIndexExpression', i, undefined);
        const parsedIndex = parseInt(String(exprValue), 10);
        if (!isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < portCount) {
          routedPort = parsedIndex;
        }
      } else {
        // Evaluate rules sequentially
        for (const rule of parsedRules) {
          const rawFieldVal = context.evaluateExpression(rule.field || '', i);
          const rawTargetVal = rule.value;
          const match = this.evaluateCondition(rawFieldVal, rule.operation, rawTargetVal);
          if (match) {
            routedPort = Number(rule.outputIndex);
            break;
          }
        }
      }

      if (routedPort >= 0 && routedPort < portCount) {
        results[routedPort].push(item);
      } else {
        const fallbackTarget = (fallbackOutput >= 0 && fallbackOutput < portCount) ? fallbackOutput : (portCount - 1);
        results[fallbackTarget].push(item);
      }
    }

    return results;
  }

  private evaluateCondition(actual: any, op: string, expected: any): boolean {
    const actStr = actual !== undefined && actual !== null ? String(actual) : '';
    const expStr = expected !== undefined && expected !== null ? String(expected) : '';

    switch (op) {
      case 'equals':
        return actStr.toLowerCase() === expStr.toLowerCase();
      case 'notEquals':
        return actStr.toLowerCase() !== expStr.toLowerCase();
      case 'contains':
        return actStr.toLowerCase().includes(expStr.toLowerCase());
      case 'larger':
        return Number(actual) > Number(expected);
      case 'smaller':
        return Number(actual) < Number(expected);
      case 'regex':
        try {
          return new RegExp(expStr, 'i').test(actStr);
        } catch {
          return false;
        }
      case 'isEmpty':
        return actStr === '' || actual === null || actual === undefined || (Array.isArray(actual) && actual.length === 0);
      case 'isNotEmpty':
        return actStr !== '' && actual !== null && actual !== undefined && (!Array.isArray(actual) || actual.length > 0);
      default:
        return false;
    }
  }
}
