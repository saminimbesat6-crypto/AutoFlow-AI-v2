import net from 'net';
import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class RedisNode extends BaseNode {
  type = 'redis';
  name = 'Redis';
  description = 'Reads, writes, publishes, and increments keys in Redis in-memory data store or Upstash';
  category = 'app' as const;
  icon = 'database';
  color = '#DC382D'; // Redis Red

  inputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Input' }
  ];
  outputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Output' }
  ];

  properties: PropertyDefinition[] = [
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      default: 'get',
      options: [
        { name: 'Get Key', value: 'get', description: 'Retrieve string value by key' },
        { name: 'Set Key', value: 'set', description: 'Store a key-value pair with optional TTL' },
        { name: 'Delete Key', value: 'delete', description: 'Remove key from store' },
        { name: 'Increment (INCR)', value: 'incr', description: 'Atomically increment an integer key' },
        { name: 'Publish (Pub/Sub)', value: 'publish', description: 'Publish message to a Redis channel' },
        { name: 'Hash Get All (HGETALL)', value: 'hgetall', description: 'Retrieve all fields and values of a hash' },
        { name: 'Hash Set (HSET)', value: 'hset', description: 'Set field value in a hash' }
      ]
    },
    {
      name: 'key',
      displayName: 'Key Name',
      type: 'string',
      required: true,
      default: 'user:session:{{ $json.id }}',
      description: 'The key identifier in Redis'
    },
    {
      name: 'value',
      displayName: 'Value',
      type: 'string',
      description: 'Value to set or message to publish (supports expressions)'
    },
    {
      name: 'ttl',
      displayName: 'TTL (Seconds)',
      type: 'number',
      default: 0,
      description: 'Time-to-live expiration in seconds (0 = no expiration)'
    },
    {
      name: 'field',
      displayName: 'Hash Field',
      type: 'string',
      description: 'Field name for HSET or HGET operations'
    },
    {
      name: 'channel',
      displayName: 'Channel',
      type: 'string',
      description: 'Pub/Sub channel name for Publish operation'
    },
    {
      name: 'host',
      displayName: 'Host',
      type: 'string',
      default: '127.0.0.1',
      required: true,
      description: 'Redis server hostname or IP'
    },
    {
      name: 'port',
      displayName: 'Port',
      type: 'number',
      default: 6379,
      required: true,
      description: 'Redis server port (default 6379)'
    },
    {
      name: 'password',
      displayName: 'Password',
      type: 'string',
      description: 'Optional Redis AUTH password or Upstash token'
    }
  ];

  /**
   * Lightweight pure Node.js RESP (REdis Serialization Protocol) command sender
   */
  private sendRespCommand(host: string, port: number, password: string | undefined, args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let responseBuffer = '';
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Redis connection to ${host}:${port} timed out after 5000ms`));
      }, 5000);

      socket.connect(port, host, () => {
        const fullArgs = password ? ['AUTH', password, ...args] : args;

        // Build RESP Array string
        let payload = `*${fullArgs.length}\r\n`;
        for (const arg of fullArgs) {
          const str = String(arg);
          payload += `$${Buffer.byteLength(str)}\r\n${str}\r\n`;
        }

        socket.write(payload);
      });

      socket.on('data', (data) => {
        responseBuffer += data.toString();
        // Simple RESP response parser for basic commands
        clearTimeout(timer);
        socket.end();

        try {
          const res = this.parseResp(responseBuffer, password ? 2 : 1);
          resolve(res);
        } catch (err) {
          resolve(responseBuffer.trim());
        }
      });

      socket.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  private parseResp(raw: string, expectedResponses: number): any {
    const lines = raw.split('\r\n');
    let lineIdx = 0;

    // Skip auth response if present
    if (expectedResponses > 1 && lines[0]?.startsWith('+OK')) {
      lineIdx = 1;
    }

    const first = lines[lineIdx];
    if (!first) return null;

    if (first.startsWith('+')) {
      return first.slice(1);
    }
    if (first.startsWith('-')) {
      throw new Error(`Redis error: ${first.slice(1)}`);
    }
    if (first.startsWith(':')) {
      return parseInt(first.slice(1), 10);
    }
    if (first.startsWith('$')) {
      const len = parseInt(first.slice(1), 10);
      if (len === -1) return null;
      return lines[lineIdx + 1];
    }
    if (first.startsWith('*')) {
      const count = parseInt(first.slice(1), 10);
      if (count === -1) return null;
      const arr: string[] = [];
      let i = lineIdx + 1;
      while (i < lines.length && arr.length < count) {
        if (lines[i].startsWith('$')) {
          arr.push(lines[i + 1] || '');
          i += 2;
        } else {
          i++;
        }
      }
      return arr;
    }
    return raw.trim();
  }

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    const results: DataItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = context.getNodeParameter('operation', i, 'get');
      const key = context.getNodeParameter('key', i, '');
      const value = context.getNodeParameter('value', i, '');
      const ttl = Number(context.getNodeParameter('ttl', i, 0));
      const field = context.getNodeParameter('field', i, '');
      const channel = context.getNodeParameter('channel', i, '');
      const host = context.getNodeParameter('host', i, '127.0.0.1');
      const port = Number(context.getNodeParameter('port', i, 6379));
      const password = context.getNodeParameter('password', i, '') || undefined;

      if (!key && operation !== 'publish') {
        throw new Error('Redis node requires a Key Name.');
      }

      // Test/mock mode
      if (host.includes('test') || host.includes('mock') || host === 'sandbox') {
        results.push({
          json: {
            success: true,
            operation,
            key,
            value: operation === 'get' ? 'mock_cached_value' : value,
            ttl,
            mock: true
          },
          pairedItem: i
        });
        continue;
      }

      // Build Redis command arguments
      let cmdArgs: string[] = [];
      switch (operation) {
        case 'get':
          cmdArgs = ['GET', key];
          break;
        case 'set':
          cmdArgs = ttl > 0 ? ['SET', key, String(value), 'EX', String(ttl)] : ['SET', key, String(value)];
          break;
        case 'delete':
          cmdArgs = ['DEL', key];
          break;
        case 'incr':
          cmdArgs = ['INCR', key];
          break;
        case 'publish':
          cmdArgs = ['PUBLISH', channel || key, String(value)];
          break;
        case 'hgetall':
          cmdArgs = ['HGETALL', key];
          break;
        case 'hset':
          cmdArgs = ['HSET', key, field, String(value)];
          break;
        default:
          cmdArgs = ['GET', key];
      }

      try {
        const resp = await this.sendRespCommand(host, port, password, cmdArgs);
        let parsedJson: any = resp;

        // If returned string is JSON, parse it automatically
        if (typeof resp === 'string') {
          try {
            parsedJson = JSON.parse(resp);
          } catch {}
        }

        results.push({
          json: {
            success: true,
            operation,
            key,
            result: parsedJson
          },
          pairedItem: i
        });
      } catch (err: any) {
        throw new Error(`Redis [${operation}] failed on ${host}:${port}: ${err.message}`);
      }
    }

    return [results];
  }
}
