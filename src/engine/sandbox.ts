import * as vm from 'node:vm';
import * as crypto from 'node:crypto';
import jmespath from 'jmespath';
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
  staticData?: Record<string, any>;
}

function formatDateTime(d: Date, pattern: string): string {
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const hours12 = hours % 12 || 12;
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();
  const ms = d.getMilliseconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  return pattern
    .replace(/yyyy|YYYY/g, String(year))
    .replace(/yy|YY/g, String(year).slice(-2))
    .replace(/MM/g, pad(month))
    .replace(/M/g, String(month))
    .replace(/dd|DD/g, pad(day))
    .replace(/d|D/g, String(day))
    .replace(/HH/g, pad(hours))
    .replace(/H/g, String(hours))
    .replace(/hh/g, pad(hours12))
    .replace(/h/g, String(hours12))
    .replace(/mm/g, pad(minutes))
    .replace(/m/g, String(minutes))
    .replace(/ss/g, pad(seconds))
    .replace(/s/g, String(seconds))
    .replace(/SSS/g, pad(ms, 3))
    .replace(/a/g, ampm.toLowerCase())
    .replace(/A/g, ampm);
}

export function createDateTimeHelper(inputDate: Date | number | string = new Date()): any {
  const date = new Date(inputDate);

  const helper: any = {
    get year() { return date.getFullYear(); },
    get month() { return date.getMonth() + 1; },
    get day() { return date.getDate(); },
    get hour() { return date.getHours(); },
    get minute() { return date.getMinutes(); },
    get second() { return date.getSeconds(); },
    get millisecond() { return date.getMilliseconds(); },
    get weekday() { return date.getDay() === 0 ? 7 : date.getDay(); },

    plus(duration: { years?: number; months?: number; weeks?: number; days?: number; hours?: number; minutes?: number; seconds?: number; milliseconds?: number } | number) {
      if (typeof duration === 'number') {
        return createDateTimeHelper(new Date(date.getTime() + duration));
      }
      const newDate = new Date(date.getTime());
      if (duration.years) newDate.setFullYear(newDate.getFullYear() + duration.years);
      if (duration.months) newDate.setMonth(newDate.getMonth() + duration.months);
      if (duration.weeks) newDate.setDate(newDate.getDate() + duration.weeks * 7);
      if (duration.days) newDate.setDate(newDate.getDate() + duration.days);
      if (duration.hours) newDate.setHours(newDate.getHours() + duration.hours);
      if (duration.minutes) newDate.setMinutes(newDate.getMinutes() + duration.minutes);
      if (duration.seconds) newDate.setSeconds(newDate.getSeconds() + duration.seconds);
      if (duration.milliseconds) newDate.setMilliseconds(newDate.getMilliseconds() + duration.milliseconds);
      return createDateTimeHelper(newDate);
    },

    minus(duration: { years?: number; months?: number; weeks?: number; days?: number; hours?: number; minutes?: number; seconds?: number; milliseconds?: number } | number) {
      if (typeof duration === 'number') {
        return createDateTimeHelper(new Date(date.getTime() - duration));
      }
      const inverted: any = {};
      for (const [k, v] of Object.entries(duration)) {
        if (typeof v === 'number') inverted[k] = -v;
      }
      return helper.plus(inverted);
    },

    format(pattern: string = 'YYYY-MM-DD HH:mm:ss'): string {
      return formatDateTime(date, pattern);
    },

    toISO(): string {
      return date.toISOString();
    },

    toISOString(): string {
      return date.toISOString();
    },

    toISODate(): string {
      return date.toISOString().split('T')[0];
    },

    toMillis(): number {
      return date.getTime();
    },

    valueOf(): number {
      return date.getTime();
    },

    toUnixInteger(): number {
      return Math.floor(date.getTime() / 1000);
    },

    toSeconds(): number {
      return Math.floor(date.getTime() / 1000);
    },

    toString(): string {
      return date.toISOString();
    },

    [Symbol.toPrimitive](hint: string) {
      if (hint === 'number') return date.getTime();
      return date.toISOString();
    }
  };

  return helper;
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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const sandboxScope: Record<string, any> = {
      $json: item.json || {},
      $binary: item.binary || {},
      $itemIndex: itemIndex,
      $input: inputHelper,
      $node: nodeProxy,
      $: dollarHelper,
      $now: createDateTimeHelper(now),
      $today: createDateTimeHelper(today),
      $jmespath: (data: any, query: string) => {
        try {
          return jmespath.search(data, query);
        } catch (e: any) {
          throw new Error(`JMESPath error: ${e.message}`);
        }
      },
      $slug: (str: string) => {
        return String(str || '')
          .toLowerCase()
          .trim()
          .replace(/[\s\W-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      },
      $hash: (str: string, algorithm: string = 'sha256') => {
        return crypto.createHash(algorithm).update(String(str || '')).digest('hex');
      },
      $base64Encode: (str: string) => Buffer.from(String(str || '')).toString('base64'),
      $base64Decode: (b64: string) => Buffer.from(String(b64 || ''), 'base64').toString('utf8'),
      $execution: {
        id: options.executionId || 'exec-dev',
        mode: options.executionMode || 'manual',
        resumeUrl: `/webhook/resume/res_${options.executionId || 'dev'}`
      },
      $workflow: {
        id: options.workflowId || 'wf-dev',
        name: options.workflowName || 'Workflow'
      },
      $staticData: options.staticData || {},
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
      Buffer,
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
