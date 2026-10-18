import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class MergeNode extends BaseNode {
  type = 'merge';
  name = 'Merge';
  description = 'Combines, aligns, joins, or synchronizes data streams from multiple input nodes';
  category = 'core' as const;
  icon = 'git-merge';
  color = '#3b82f6'; // Blue

  inputs: PortDefinition[] = [
    { name: 'input1', type: 'main', label: 'Input 1' },
    { name: 'input2', type: 'main', label: 'Input 2' }
  ];
  outputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Output' }
  ];

  properties: PropertyDefinition[] = [
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      default: 'append',
      options: [
        { name: 'Append (Concatenate All)', value: 'append', description: 'Combine all items from all incoming branches' },
        { name: 'Combine by Key (Join)', value: 'combineByKey', description: 'Merge objects matching on a specific field key' },
        { name: 'Combine by Position (Index)', value: 'mergeByIndex', description: 'Merge item 0 with item 0, item 1 with item 1' },
        { name: 'Choose Branch (Pass-Through)', value: 'chooseBranch', description: 'Output data from one designated branch only' },
        { name: 'Wait (Synchronize Branches)', value: 'wait', description: 'Wait until all incoming branches complete before continuing' }
      ]
    },
    {
      name: 'joinKey1',
      displayName: 'Input 1 Field Key',
      type: 'string',
      default: 'id',
      description: 'Field to match on Input 1 items (for Combine by Key)'
    },
    {
      name: 'joinKey2',
      displayName: 'Input 2 Field Key',
      type: 'string',
      default: 'id',
      description: 'Field to match on Input 2 items (for Combine by Key)'
    },
    {
      name: 'chosenBranch',
      displayName: 'Output Branch',
      type: 'options',
      default: '1',
      options: [
        { name: 'Input 1', value: '1' },
        { name: 'Input 2', value: '2' }
      ]
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const mode = context.getNodeParameter('mode', 0, 'append');
    const inputItems = context.inputData || [];

    if (mode === 'append' || mode === 'wait') {
      return [inputItems];
    }

    if (mode === 'chooseBranch') {
      const chosen = context.getNodeParameter('chosenBranch', 0, '1');
      const mid = Math.ceil(inputItems.length / 2);
      const branchItems = chosen === '1' ? inputItems.slice(0, mid) : inputItems.slice(mid);
      return [branchItems.length > 0 ? branchItems : inputItems];
    }

    if (mode === 'mergeByIndex') {
      const mid = Math.ceil(inputItems.length / 2);
      const listA = inputItems.slice(0, mid);
      const listB = inputItems.slice(mid);

      const merged: DataItem[] = [];
      const maxLen = Math.max(listA.length, listB.length);

      for (let i = 0; i < maxLen; i++) {
        merged.push({
          json: {
            ...(listA[i]?.json || {}),
            ...(listB[i]?.json || {})
          },
          binary: {
            ...(listA[i]?.binary || {}),
            ...(listB[i]?.binary || {})
          },
          pairedItem: i
        });
      }
      return [merged];
    }

    if (mode === 'combineByKey') {
      const key1 = context.getNodeParameter('joinKey1', 0, 'id');
      const key2 = context.getNodeParameter('joinKey2', 0, 'id');

      const mid = Math.ceil(inputItems.length / 2);
      const listA = inputItems.slice(0, mid);
      const listB = inputItems.slice(mid);

      const mapB = new Map<string, Record<string, any>>();
      for (const itemB of listB) {
        const valB = itemB.json?.[key2];
        if (valB !== undefined) {
          mapB.set(String(valB), itemB.json);
        }
      }

      const merged: DataItem[] = [];
      for (let i = 0; i < listA.length; i++) {
        const valA = listA[i].json?.[key1];
        const matchB = valA !== undefined ? mapB.get(String(valA)) : undefined;

        merged.push({
          json: {
            ...listA[i].json,
            ...(matchB || {})
          },
          binary: listA[i].binary,
          pairedItem: i
        });
      }

      return [merged];
    }

    return [inputItems];
  }
}
