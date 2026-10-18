import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class MergeNode extends BaseNode {
  type = 'merge';
  name = 'Merge';
  description = 'Combines, aligns, joins (inner/left/right/outer), multiplexes, or synchronizes data streams from multiple input nodes';
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
        { name: 'Append (Concatenate All)', value: 'append', description: 'Stack all items from all incoming branches sequentially' },
        { name: 'Combine by Matching Fields (SQL Join)', value: 'combineByKey', description: 'Merge records matching on specific key fields (Inner, Left, Right, Outer)' },
        { name: 'Combine by Position (Index)', value: 'mergeByIndex', description: 'Merge item 0 with item 0, item 1 with item 1' },
        { name: 'Cross Join (Multiplex / Cartesian Product)', value: 'crossJoin', description: 'Pair every item from Input 1 with every item from Input 2' },
        { name: 'Choose Branch (Pass-Through)', value: 'chooseBranch', description: 'Output data from one designated branch only' },
        { name: 'Wait (Synchronize Branches)', value: 'wait', description: 'Wait until all incoming branches complete before continuing' }
      ]
    },
    {
      name: 'joinType',
      displayName: 'Join Type',
      type: 'options',
      default: 'enrichInput1',
      options: [
        { name: 'Enrich Input 1 (Left Join)', value: 'enrichInput1', description: 'Keep all Input 1 items, enriching matches from Input 2' },
        { name: 'Keep Matches Only (Inner Join)', value: 'keepMatches', description: 'Only output records that exist in both Input 1 and Input 2' },
        { name: 'Keep Everything (Full Outer Join)', value: 'keepEverything', description: 'Output all items from both inputs, matching where possible' },
        { name: 'Enrich Input 2 (Right Join)', value: 'enrichInput2', description: 'Keep all Input 2 items, enriching matches from Input 1' }
      ]
    },
    {
      name: 'joinKey1',
      displayName: 'Input 1 Match Field',
      type: 'string',
      default: 'id',
      description: 'Field to match on Input 1 items'
    },
    {
      name: 'joinKey2',
      displayName: 'Input 2 Match Field',
      type: 'string',
      default: 'id',
      description: 'Field to match on Input 2 items'
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

  private getInputs(context: NodeExecutionContext): { listA: DataItem[]; listB: DataItem[] } {
    let listA = context.getInputData(0);
    let listB = context.getInputData(1);

    // If inputs were not separated into distinct ports (e.g. single port or legacy graph),
    // split the single consolidated input array evenly into two lists
    if (context.inputsByPort && context.inputsByPort.length > 1) {
      listA = context.inputsByPort[0] || [];
      listB = context.inputsByPort[1] || [];
    } else if (context.inputData && context.inputData.length > 0 && listA === listB) {
      const mid = Math.ceil(context.inputData.length / 2);
      listA = context.inputData.slice(0, mid);
      listB = context.inputData.slice(mid);
    }

    return { listA, listB };
  }

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const mode = context.getNodeParameter('mode', 0, 'append');
    const { listA, listB } = this.getInputs(context);

    // 1. Append Mode
    if (mode === 'append' || mode === 'wait') {
      return [[...listA, ...listB]];
    }

    // 2. Choose Branch Mode
    if (mode === 'chooseBranch') {
      const chosen = context.getNodeParameter('chosenBranch', 0, '1');
      return chosen === '1' ? [listA] : [listB];
    }

    // 3. Combine by Position (Index)
    if (mode === 'mergeByIndex') {
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

    // 4. Cross Join (Cartesian Product)
    if (mode === 'crossJoin') {
      const merged: DataItem[] = [];
      let paired = 0;

      for (const itemA of listA) {
        for (const itemB of listB) {
          merged.push({
            json: {
              ...(itemA.json || {}),
              ...(itemB.json || {})
            },
            binary: {
              ...(itemA.binary || {}),
              ...(itemB.binary || {})
            },
            pairedItem: paired++
          });
        }
      }
      return [merged];
    }

    // 5. Combine by Matching Fields (SQL Join)
    if (mode === 'combineByKey') {
      const joinType = context.getNodeParameter('joinType', 0, 'enrichInput1');
      const key1 = context.getNodeParameter('joinKey1', 0, 'id');
      const key2 = context.getNodeParameter('joinKey2', 0, 'id');

      const mapB = new Map<string, DataItem>();
      const matchedBKeys = new Set<string>();

      for (const itemB of listB) {
        const valB = itemB.json?.[key2];
        if (valB !== undefined) {
          mapB.set(String(valB), itemB);
        }
      }

      const merged: DataItem[] = [];

      for (let i = 0; i < listA.length; i++) {
        const valA = listA[i].json?.[key1];
        const matchItemB = valA !== undefined ? mapB.get(String(valA)) : undefined;

        if (matchItemB && valA !== undefined) {
          matchedBKeys.add(String(valA));
        }

        if (joinType === 'keepMatches' && !matchItemB) {
          // Inner join: skip unmatched Input 1 items
          continue;
        }

        merged.push({
          json: {
            ...listA[i].json,
            ...(matchItemB?.json || {})
          },
          binary: {
            ...(listA[i].binary || {}),
            ...(matchItemB?.binary || {})
          },
          pairedItem: i
        });
      }

      // If full outer join, append remaining unmatched items from listB
      if (joinType === 'keepEverything') {
        for (let j = 0; j < listB.length; j++) {
          const valB = listB[j].json?.[key2];
          if (valB === undefined || !matchedBKeys.has(String(valB))) {
            merged.push({
              json: { ...listB[j].json },
              binary: listB[j].binary,
              pairedItem: merged.length
            });
          }
        }
      }

      // If right join, output listB enriched with listA
      if (joinType === 'enrichInput2') {
        const mapA = new Map<string, DataItem>();
        for (const itemA of listA) {
          const valA = itemA.json?.[key1];
          if (valA !== undefined) mapA.set(String(valA), itemA);
        }

        const rightMerged: DataItem[] = [];
        for (let j = 0; j < listB.length; j++) {
          const valB = listB[j].json?.[key2];
          const matchItemA = valB !== undefined ? mapA.get(String(valB)) : undefined;
          rightMerged.push({
            json: {
              ...listB[j].json,
              ...(matchItemA?.json || {})
            },
            binary: {
              ...(listB[j].binary || {}),
              ...(matchItemA?.binary || {})
            },
            pairedItem: j
          });
        }
        return [rightMerged];
      }

      return [merged];
    }

    return [[...listA, ...listB]];
  }
}
