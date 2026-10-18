import * as vm from 'node:vm';
import { DataItem } from '../types/workflow';

export interface SandboxContextOptions {
  itemData?: DataItem;
  itemIndex?: number;
  allInputData?: DataItem[];
  nodeOutputs?: Map<string, DataItem[][]>;
  workflowId?: string;
  workflowName?: string;
  executionId?: string;
  executionMode?: string;
  env?: Record<string, string>;
}

export class ExpressionSandbox {
  /**
   * Safely evaluates a single JavaScript expression string within a constrained VM context
   */
  static evaluate(expression: string, options: SandboxContextOptions = {}): any {
    const item = options.itemData || { json: {} };
    const itemIndex = options.itemIndex || 0;
    const allInputs = options.allInputData || [item];
    const nodeOutputs = options.nodeOutputs || new Map();

    // Build $node helper lookup
    const nodeProxy: Record<string, any> = {};
    for (const [nodeKey, out] of nodeOutputs.entries()) {
      const mainItems = out[0] || [];
      nodeProxy[nodeKey] = {
        json: mainItems[itemIndex]?.json || mainItems[0]?.json || {},
        binary: mainItems[itemIndex]?.binary || mainItems[0]?.binary || {},
        all: () => mainItems,
        first: () => mainItems[0] || { json: {} },
        data: mainItems
      };
    }

    // Build modern $('NodeName') lookup
    const dollarHelper = (nodeName: string) => {
      const match = nodeProxy[nodeName] || {
        json: {},
        all: () => [],
        first: () => ({ json: {} }),
        item: { json: {}, binary: {} }
      };
      return {
        ...match,
        item: {
          json: match.json,
          binary: match.binary
        }
      };
    };

    // Build $input helper
    const inputHelper = {
      item: item,
      first: () => allInputs[0] || { json: {} },
      all: () => allInputs,
      itemIndex
    };

    const now = new Date();
    const sandboxScope: Record<string, any> = {
      $json: item.json || {},
      $binary: item.binary || {},
      $itemIndex: itemIndex,
      $input: inputHelper,
      $node: nodeProxy,
      $: dollarHelper,
      $now: now.toISOString(),
      $today: now.toISOString().split('T')[0],
      $execution: {
        id: options.executionId || 'exec-dev',
        mode: options.executionMode || 'manual',
        resumeUrl: `/webhook/resume/res_${options.executionId || 'dev'}`
      },
      $workflow: {
        id: options.workflowId || 'wf-dev',
        name: options.workflowName || 'Workflow'
      },
      // Safe built-in utilities
      Math,
      Date,
      JSON,
      String,
      Number,
      Boolean,
      Array,
      Object,
      RegExp,
      parseInt,
      parseFloat,
      encodeURIComponent,
      decodeURIComponent,
      isNaN,
      isFinite
    };

    const context = vm.createContext(sandboxScope);

    // Clean expression (strip enclosing curly braces if present)
    let cleanCode = expression.trim();
    if (cleanCode.startsWith('{{') && cleanCode.endsWith('}}')) {
      cleanCode = cleanCode.substring(2, cleanCode.length - 2).trim();
    }

    try {
      const script = new vm.Script(`(${cleanCode})`);
      return script.runInContext(context, { timeout: 2000 });
    } catch (err: any) {
      // If direct return failed (e.g. multi-statement code), try running as block
      try {
        const blockScript = new vm.Script(cleanCode);
        return blockScript.runInContext(context, { timeout: 2000 });
      } catch (blockErr: any) {
        throw new Error(`Expression evaluation error: ${err.message}`);
      }
    }
  }

  /**
   * Interpolates {{ ... }} expressions inside a string template
   */
  static interpolate(template: string, options: SandboxContextOptions = {}): any {
    if (typeof template !== 'string') return template;

    // Single expression exact replacement e.g. "{{ $json.total }}" preserves object/number types
    const singleMatch = template.match(/^\{\{\s*(.*?)\s*\}\}$/s);
    if (singleMatch) {
      try {
        return this.evaluate(singleMatch[1], options);
      } catch {
        return undefined;
      }
    }

    // String interpolation e.g. "Hello {{ $json.name }}, total is ${{ $json.price }}"
    return template.replace(/\{\{\s*(.*?)\s*\}\}/gs, (_, expr) => {
      try {
        const val = this.evaluate(expr, options);
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      } catch {
        return '';
      }
    });
  }
}
