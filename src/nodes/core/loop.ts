import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

interface LoopState {
  totalItems: DataItem[];
  currentIndex: number;
  accumulatedResults: DataItem[];
}

export class LoopNode extends BaseNode {
  type = 'loop';
  name = 'Loop Over Items';
  description = 'Iterates over incoming data items in micro-batches, routing each batch to the loop body and the finished collection to done';
  category = 'core' as const;
  icon = 'repeat';
  color = '#06b6d4'; // Cyan

  inputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Input' }
  ];

  outputs: PortDefinition[] = [
    { name: 'loop', type: 'main', label: 'Loop (Current Batch)' },
    { name: 'done', type: 'main', label: 'Done (Completed)' }
  ];

  properties: PropertyDefinition[] = [
    {
      name: 'batchSize',
      displayName: 'Batch Size',
      type: 'number',
      default: 1,
      required: true,
      description: 'The number of items to process in each iteration loop'
    },
    {
      name: 'reset',
      displayName: 'Reset Loop State',
      type: 'boolean',
      default: false,
      description: 'Reset counter on every invocation'
    }
  ];

  // In-memory execution state storage
  private static executionStates: Map<string, LoopState> = new Map();

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const batchSize = Math.max(1, Number(context.getNodeParameter('batchSize', 0, 1)));
    const reset = Boolean(context.getNodeParameter('reset', 0, false));
    const incomingItems = context.inputData || [];

    const stateKey = `${context.node.id}`;
    let state = LoopNode.executionStates.get(stateKey);

    // Initial pass or explicit reset
    if (!state || reset) {
      state = {
        totalItems: [...incomingItems],
        currentIndex: 0,
        accumulatedResults: []
      };
      LoopNode.executionStates.set(stateKey, state);
    } else if (incomingItems.length > 0 && state.currentIndex > 0) {
      // Accumulate output coming back from previous loop iteration
      state.accumulatedResults.push(...incomingItems);
    }

    // Check if more items remain to process
    if (state.currentIndex < state.totalItems.length) {
      const nextBatch = state.totalItems.slice(state.currentIndex, state.currentIndex + batchSize);
      state.currentIndex += batchSize;

      // Output 0 = Loop (active batch)
      // Output 1 = Done (empty until loop concludes)
      return [nextBatch, []];
    } else {
      // Loop finished: emit all accumulated results to 'done' output
      const finalItems = state.accumulatedResults.length > 0
        ? state.accumulatedResults
        : state.totalItems;

      // Clear state for next run
      LoopNode.executionStates.delete(stateKey);

      // Output 0 = Loop (empty)
      // Output 1 = Done (all finished items)
      return [[], finalItems];
    }
  }

  static resetAll(): void {
    LoopNode.executionStates.clear();
  }
}
