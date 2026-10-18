import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class AggregateNode extends BaseNode {
  type = 'aggregate';
  name = 'Aggregate';
  description = 'Consolidates multiple incoming items into lists, extracts arrays of fields, or computes sums and averages';
  category = 'transform' as const;
  icon = 'layers';
  color = '#8b5cf6'; // Violet

  inputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Input' }
  ];
  outputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Output' }
  ];

  properties: PropertyDefinition[] = [
    {
      name: 'aggregateType',
      displayName: 'Aggregate Type',
      type: 'options',
      default: 'aggregateAllItems',
      options: [
        { name: 'All Items into a Single List', value: 'aggregateAllItems', description: 'Combines all incoming items into one array under a target field' },
        { name: 'Aggregate Specific Fields', value: 'aggregateFields', description: 'Extracts one or more fields from each item into arrays' },
        { name: 'Math / Numeric Operations', value: 'mathOperation', description: 'Computes sum, average, min, max, or count across items' }
      ]
    },
    {
      name: 'destinationField',
      displayName: 'Destination Field Name',
      type: 'string',
      default: 'data',
      description: 'The property name on the single output item'
    },
    {
      name: 'fieldsToAggregate',
      displayName: 'Fields to Extract (Comma-Separated)',
      type: 'string',
      default: 'id, email',
      description: 'Comma-separated keys to aggregate into arrays (for Aggregate Specific Fields)'
    },
    {
      name: 'mathOperation',
      displayName: 'Math Operation',
      type: 'options',
      default: 'sum',
      options: [
        { name: 'Sum', value: 'sum' },
        { name: 'Average', value: 'avg' },
        { name: 'Minimum', value: 'min' },
        { name: 'Maximum', value: 'max' },
        { name: 'Count Items', value: 'count' }
      ]
    },
    {
      name: 'targetMathField',
      displayName: 'Numeric Field',
      type: 'string',
      default: 'amount',
      description: 'Name of the numeric property to perform calculation on'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData || [];
    if (items.length === 0) {
      return [[{ json: {} }]];
    }

    const aggregateType = context.getNodeParameter('aggregateType', 0, 'aggregateAllItems');
    const destField = context.getNodeParameter('destinationField', 0, 'data');

    if (aggregateType === 'aggregateAllItems') {
      const allJson = items.map((it) => it.json);
      return [[{
        json: {
          [destField]: allJson,
          count: items.length
        }
      }]];
    }

    if (aggregateType === 'aggregateFields') {
      const rawFields = context.getNodeParameter('fieldsToAggregate', 0, '');
      const fieldNames = rawFields.split(',').map((f: string) => f.trim()).filter(Boolean);

      const aggregatedObj: Record<string, any[]> = {};
      for (const fn of fieldNames) {
        aggregatedObj[fn] = [];
      }

      for (const item of items) {
        for (const fn of fieldNames) {
          if (item.json && item.json[fn] !== undefined) {
            aggregatedObj[fn].push(item.json[fn]);
          }
        }
      }

      return [[{
        json: {
          ...aggregatedObj,
          totalItems: items.length
        }
      }]];
    }

    if (aggregateType === 'mathOperation') {
      const mathOp = context.getNodeParameter('mathOperation', 0, 'sum');
      const targetField = context.getNodeParameter('targetMathField', 0, 'amount');

      const values: number[] = [];
      for (const it of items) {
        const val = Number(it.json?.[targetField]);
        if (!isNaN(val)) {
          values.push(val);
        }
      }

      let result = 0;
      if (mathOp === 'count') {
        result = items.length;
      } else if (values.length > 0) {
        if (mathOp === 'sum') {
          result = values.reduce((acc, v) => acc + v, 0);
        } else if (mathOp === 'avg') {
          result = values.reduce((acc, v) => acc + v, 0) / values.length;
        } else if (mathOp === 'min') {
          result = Math.min(...values);
        } else if (mathOp === 'max') {
          result = Math.max(...values);
        }
      }

      return [[{
        json: {
          operation: mathOp,
          field: targetField,
          result,
          count: items.length,
          validNumberCount: values.length
        }
      }]];
    }

    return [[{ json: { items: items.map((it) => it.json) } }]];
  }
}
