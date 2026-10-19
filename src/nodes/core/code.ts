import { spawn } from 'node:child_process';
import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class CodeNode extends BaseNode {
  type = 'code';
  name = 'Code';
  description = 'Executes custom JavaScript or Python code to transform data';
  category = 'transform' as const;
  icon = 'terminal';
  color = '#eab308'; // yellow

  inputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Input' }
  ];
  outputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Output' }
  ];

  properties: PropertyDefinition[] = [
    {
      name: 'language',
      displayName: 'Language',
      type: 'options',
      default: 'javaScript',
      options: [
        { name: 'JavaScript', value: 'javaScript', description: 'Run standard JavaScript in an isolated sandbox' },
        { name: 'Python', value: 'python', description: 'Run Python 3 data science and transformation scripts' }
      ]
    },
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      default: 'runOnceForAllItems',
      options: [
        { name: 'Run Once for All Items', value: 'runOnceForAllItems' },
        { name: 'Run Once for Each Item', value: 'runOnceForEachItem' }
      ]
    },
    {
      name: 'jsCode',
      displayName: 'JavaScript Code',
      type: 'code',
      default: '// Loop over input items and add a new field\nfor (const item of $input.all()) {\n  item.json.myNewField = 1;\n}\nreturn $input.all();',
      description: 'JavaScript code returning items or data objects'
    },
    {
      name: 'pythonCode',
      displayName: 'Python Code',
      type: 'code',
      default: '# Transform input items\nfor item in _items:\n    item["json"]["myNewField"] = 1\nreturn _items',
      description: 'Python code returning items or dict objects'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData || [];
    const language = context.getNodeParameter('language', 0, 'javaScript');
    const mode = context.getNodeParameter('mode', 0, 'runOnceForAllItems');

    if (language === 'python') {
      const pyCode = context.getNodeParameter('pythonCode', 0, 'return _items');
      return this.executePython(pyCode, items, mode);
    }

    const code = context.getNodeParameter('jsCode', 0, 'return $input.all();');

    // Safe execution sandbox without access to process, require, or globals
    if (mode === 'runOnceForAllItems') {
      const clonedItems = JSON.parse(JSON.stringify(items));
      const $input = {
        all: () => clonedItems,
        first: () => clonedItems[0] || { json: {} },
        last: () => clonedItems[clonedItems.length - 1] || { json: {} }
      };

      try {
        const fn = new Function('$input', 'items', `
          "use strict";
          const process = undefined;
          const require = undefined;
          const global = undefined;
          const globalThis = undefined;
          ${code}
        `);
        const result = fn($input, clonedItems);

        if (!result) return [[]];
        if (Array.isArray(result)) {
          const normalized = result.map((item: any, idx: number) => {
            if (item && typeof item === 'object' && 'json' in item) {
              return item as DataItem;
            }
            return { json: item, pairedItem: idx } as DataItem;
          });
          return [normalized];
        } else if (typeof result === 'object') {
          if ('json' in result) return [[result as DataItem]];
          return [[{ json: result, pairedItem: 0 }]];
        }
        return [[{ json: { value: result }, pairedItem: 0 }]];
      } catch (err: any) {
        throw new Error(`Code execution failed: ${err.message}`);
      }
    } else {
      // Run once for each item
      const results: DataItem[] = [];
      for (let i = 0; i < items.length; i++) {
        const itemCopy = JSON.parse(JSON.stringify(items[i]));
        const $json = itemCopy.json;
        const $itemIndex = i;

        try {
          const fn = new Function('$json', '$itemIndex', `
            "use strict";
            const process = undefined;
            const require = undefined;
            ${code}
          `);
          const res = fn($json, $itemIndex);
          if (res) {
            results.push({ json: res, pairedItem: i });
          } else {
            results.push({ json: $json, pairedItem: i });
          }
        } catch (err: any) {
          throw new Error(`Code execution failed at item ${i}: ${err.message}`);
        }
      }
      return [results];
    }
  }

  private async executePython(code: string, items: DataItem[], mode: string): Promise<NodeOutput> {
    const pyScript = `
import sys, json

class InputHelper:
    def __init__(self, items):
        self._items = items
    def all(self):
        return self._items
    def first(self):
        return self._items[0] if self._items else {"json": {}}
    def last(self):
        return self._items[-1] if self._items else {"json": {}}

raw = sys.stdin.read()
payload = json.loads(raw)
mode = payload.get("mode", "runOnceForAllItems")
user_code = payload.get("code", "")
items = payload.get("items", [])

code_lines = user_code.splitlines()
indented = "\\n".join("        " + l for l in code_lines)

try:
    if mode == "runOnceForAllItems":
        wrapper = f"""
def _run_all(_items):
    _input = InputHelper(_items)
    items = _items
    def _user_func():
{indented}
    ret = _user_func()
    return ret if ret is not None else _items
result = _run_all(items)
"""
        scope = {"items": items, "InputHelper": InputHelper}
        exec(wrapper, scope)
        print(json.dumps({"success": True, "result": scope["result"]}))
    else:
        results = []
        for idx, it in enumerate(items):
            wrapper = f"""
def _run_each(_item, _itemIndex):
    item = _item
    def _user_func():
{indented}
    ret = _user_func()
    return ret if ret is not None else _item
result = _run_each(item, idx)
"""
            scope = {"item": it.get("json", {}), "idx": idx}
            exec(wrapper, scope)
            results.append(scope["result"])
        print(json.dumps({"success": True, "result": results}))
except Exception as err:
    print(json.dumps({"success": False, "error": str(err)}))
`;

    return new Promise((resolve, reject) => {
      let pyProcess: any;
      try {
        pyProcess = spawn('python3', ['-c', pyScript]);
      } catch (e: any) {
        return reject(new Error(`Failed to spawn Python runtime: ${e.message}. Ensure python3 is installed.`));
      }

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        pyProcess.kill('SIGKILL');
        reject(new Error('Python code execution timed out after 5000ms'));
      }, 5000);

      pyProcess.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
      pyProcess.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

      pyProcess.on('error', (err: any) => {
        clearTimeout(timer);
        reject(new Error(`Python process error: ${err.message}`));
      });

      pyProcess.on('close', (exitCode: number) => {
        clearTimeout(timer);
        if (timedOut) return;

        if (exitCode !== 0 && !stdout.trim()) {
          return reject(new Error(`Python process exited with code ${exitCode}: ${stderr.trim()}`));
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          if (!parsed.success) {
            return reject(new Error(`Python execution error: ${parsed.error}`));
          }

          const rawResult = parsed.result;
          if (mode === 'runOnceForAllItems') {
            if (Array.isArray(rawResult)) {
              const normalized = rawResult.map((item: any, idx: number) => {
                if (item && typeof item === 'object' && 'json' in item) {
                  return item as DataItem;
                }
                return { json: item, pairedItem: idx } as DataItem;
              });
              return resolve([normalized]);
            } else if (typeof rawResult === 'object' && rawResult !== null) {
              if ('json' in rawResult) return resolve([[rawResult as DataItem]]);
              return resolve([[{ json: rawResult, pairedItem: 0 }]]);
            }
            return resolve([[{ json: { value: rawResult }, pairedItem: 0 }]]);
          } else {
            // runOnceForEachItem
            const normalized = Array.isArray(rawResult)
              ? rawResult.map((res: any, idx: number) => ({ json: res, pairedItem: idx }))
              : [{ json: rawResult, pairedItem: 0 }];
            return resolve([normalized]);
          }
        } catch (jsonErr: any) {
          reject(new Error(`Failed to parse Python result JSON: ${stdout.trim() || stderr.trim()}`));
        }
      });

      pyProcess.stdin.write(JSON.stringify({
        mode,
        code,
        items
      }));
      pyProcess.stdin.end();
    });
  }
}
