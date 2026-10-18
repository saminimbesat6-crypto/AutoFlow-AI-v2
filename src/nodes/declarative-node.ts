import { BaseNode, NodeCategory } from './base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../types/workflow';
import { NodeExecutionContext } from '../engine/context';

export interface DeclarativeOperation {
  name: string;
  displayName: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description?: string;
  queryParameters?: Record<string, string>;
  bodyParameters?: Record<string, any>;
  headers?: Record<string, string>;
  itemsPath?: string;
  properties?: PropertyDefinition[];
}

export interface DeclarativeResource {
  name: string;
  displayName: string;
  operations: DeclarativeOperation[];
}

export interface DeclarativeManifest {
  type: string;
  name: string;
  description: string;
  category: NodeCategory;
  icon: string;
  color: string;
  baseURL: string;
  auth: {
    type: 'bearer' | 'apiKey' | 'basic' | 'oauth2' | 'header';
    headerName?: string;
    queryParamName?: string;
    credentialType?: string;
    tokenPrefix?: string; // defaults to 'Bearer '
  };
  resources: DeclarativeResource[];
  globalProperties?: PropertyDefinition[];
}

export class DeclarativeNode extends BaseNode {
  public type: string;
  public name: string;
  public description: string;
  public category: NodeCategory;
  public icon: string;
  public color: string;
  public manifest: DeclarativeManifest;

  public inputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Input' }
  ];
  public outputs: PortDefinition[] = [
    { name: 'main', type: 'main', label: 'Output' }
  ];
  public properties: PropertyDefinition[];

  constructor(manifest: DeclarativeManifest) {
    super();
    this.manifest = manifest;
    this.type = manifest.type;
    this.name = manifest.name;
    this.description = manifest.description;
    this.category = manifest.category;
    this.icon = manifest.icon;
    this.color = manifest.color;

    this.properties = this.buildProperties(manifest);
  }

  private buildProperties(manifest: DeclarativeManifest): PropertyDefinition[] {
    const props: PropertyDefinition[] = [];

    // 1. Resource Selector
    if (manifest.resources.length > 0) {
      props.push({
        name: 'resource',
        displayName: 'Resource',
        type: 'options',
        default: manifest.resources[0].name,
        options: manifest.resources.map((r) => ({
          name: r.displayName,
          value: r.name
        })),
        required: true
      });

      // 2. Operation Selector
      const allOps: Array<{ name: string; value: string; description?: string }> = [];
      for (const res of manifest.resources) {
        for (const op of res.operations) {
          allOps.push({
            name: `${res.displayName}: ${op.displayName}`,
            value: `${res.name}:${op.name}`,
            description: op.description
          });
        }
      }

      props.push({
        name: 'operation',
        displayName: 'Operation',
        type: 'options',
        default: allOps[0]?.value || '',
        options: allOps,
        required: true
      });
    }

    // 3. Credential Picker
    props.push({
      name: 'credentialId',
      displayName: 'Credential',
      type: 'credential',
      credentialType: manifest.auth.credentialType || manifest.auth.type,
      description: `Select saved ${manifest.name} credentials`
    });

    // 4. Operation-specific properties
    for (const res of manifest.resources) {
      for (const op of res.operations) {
        if (op.properties) {
          for (const p of op.properties) {
            // Avoid duplicate property names
            if (!props.some((existing) => existing.name === p.name)) {
              props.push(p);
            }
          }
        }
      }
    }

    // 5. Global extra properties (if any)
    if (manifest.globalProperties) {
      for (const gp of manifest.globalProperties) {
        if (!props.some((existing) => existing.name === gp.name)) {
          props.push(gp);
        }
      }
    }

    return props;
  }

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    const results: DataItem[] = [];

    // Resolve resource & operation
    let resourceName = context.getNodeParameter('resource', 0, '');
    let operationName = context.getNodeParameter('operation', 0, '');

    // Allow combined "resource:operation" value
    if (operationName.includes(':')) {
      const parts = operationName.split(':');
      resourceName = parts[0];
      operationName = parts[1];
    }

    const resource = this.manifest.resources.find((r) => r.name === resourceName) || this.manifest.resources[0];
    if (!resource) {
      throw new Error(`Invalid resource "${resourceName}" for ${this.name}`);
    }

    const op = resource.operations.find((o) => o.name === operationName) || resource.operations[0];
    if (!op) {
      throw new Error(`Invalid operation "${operationName}" for resource "${resource.name}" in ${this.name}`);
    }

    // Resolve Authentication
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'AutoFlow-AI/1.0',
      ...(op.headers || {})
    };

    const queryParams: Record<string, string> = {};

    const authType = this.manifest.auth.type;
    const credType = this.manifest.auth.credentialType || authType;

    if (authType === 'oauth2') {
      const token = await context.getOAuth2Token(credType);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } else if (authType === 'bearer') {
      const cred = context.getCredentials<{ token?: string; apiKey?: string }>(credType);
      const token = cred?.token || cred?.apiKey;
      if (token) {
        headers['Authorization'] = `${this.manifest.auth.tokenPrefix || 'Bearer '}${token}`;
      }
    } else if (authType === 'apiKey' || authType === 'header') {
      const cred = context.getCredentials<{ apiKey?: string; token?: string; value?: string }>(credType);
      const keyVal = cred?.apiKey || cred?.token || cred?.value;
      if (keyVal) {
        if (this.manifest.auth.headerName) {
          headers[this.manifest.auth.headerName] = keyVal;
        } else if (this.manifest.auth.queryParamName) {
          queryParams[this.manifest.auth.queryParamName] = keyVal;
        }
      }
    } else if (authType === 'basic') {
      const cred = context.getCredentials<{ user?: string; password?: string; username?: string }>(credType);
      const user = cred?.user || cred?.username || '';
      const pass = cred?.password || '';
      if (user || pass) {
        const b64 = Buffer.from(`${user}:${pass}`).toString('base64');
        headers['Authorization'] = `Basic ${b64}`;
      }
    }

    // Execute requests per item
    for (let i = 0; i < items.length; i++) {
      // Interpolate path: replace {param} or {{ $json.param }}
      let targetPath = op.path;

      // Extract template variables in path: {var} or {{ ... }}
      targetPath = targetPath.replace(/\{(\w+)\}/g, (_match, pName) => {
        const val = context.getNodeParameter(pName, i, undefined) ?? items[i].json?.[pName] ?? '';
        return encodeURIComponent(String(val));
      });

      if (targetPath.includes('{{') && targetPath.includes('}}')) {
        targetPath = context.evaluateExpression(targetPath, i);
      }

      // Collect query parameters
      const currentQuery = { ...queryParams };
      if (op.queryParameters) {
        for (const [k, v] of Object.entries(op.queryParameters)) {
          let paramVal = v;
          if (typeof v === 'string' && v.startsWith('$param:')) {
            const propName = v.slice(7);
            paramVal = context.getNodeParameter(propName, i, '');
          } else if (typeof v === 'string' && v.includes('{{')) {
            paramVal = context.evaluateExpression(v, i);
          }
          if (paramVal !== undefined && paramVal !== null && paramVal !== '') {
            currentQuery[k] = String(paramVal);
          }
        }
      }

      // Also pick up any node parameters explicitly declared in op.properties that should go into query
      if (op.properties) {
        for (const p of op.properties) {
          const val = context.getNodeParameter(p.name, i, undefined);
          if (val !== undefined && val !== null && val !== '') {
            // If GET or DELETE, pass undefined parameters as query params if not in path
            if (['GET', 'DELETE'].includes(op.method) && !op.path.includes(`{${p.name}}`)) {
              currentQuery[p.name] = String(val);
            }
          }
        }
      }

      // Collect body parameters
      let requestBody: any = undefined;
      if (['POST', 'PUT', 'PATCH'].includes(op.method)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        const bodyObj: Record<string, any> = {};

        const resolveParamValue = (val: any): any => {
          if (typeof val === 'string') {
            if (val.startsWith('$param:')) {
              const propName = val.slice(7);
              return context.getNodeParameter(propName, i, undefined);
            }
            if (val.includes('{{') && val.includes('}}')) {
              return context.evaluateExpression(val, i);
            }
            return val;
          }
          if (Array.isArray(val)) {
            return val.map(resolveParamValue);
          }
          if (val && typeof val === 'object') {
            const out: Record<string, any> = {};
            for (const [k, v] of Object.entries(val)) {
              out[k] = resolveParamValue(v);
            }
            return out;
          }
          return val;
        };

        // 1. Defined bodyParameters
        if (op.bodyParameters) {
          for (const [bk, bv] of Object.entries(op.bodyParameters)) {
            bodyObj[bk] = resolveParamValue(bv);
          }
        }

        // 2. Specific properties defined on operation
        if (op.properties) {
          for (const p of op.properties) {
            if (!op.path.includes(`{${p.name}}`)) {
              const val = context.getNodeParameter(p.name, i, undefined);
              if (val !== undefined) {
                bodyObj[p.name] = val;
              }
            }
          }
        }

        // 3. Or rawJson body property if present
        const customJson = context.getNodeParameter('customJson', i, undefined);
        if (customJson && typeof customJson === 'object') {
          Object.assign(bodyObj, customJson);
        }

        requestBody = JSON.stringify(bodyObj);
      }

      // Construct final URL
      const base = this.manifest.baseURL.endsWith('/') ? this.manifest.baseURL.slice(0, -1) : this.manifest.baseURL;
      const pathPart = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
      const urlObj = new URL(`${base}${pathPart}`);

      for (const [qk, qv] of Object.entries(currentQuery)) {
        urlObj.searchParams.set(qk, qv);
      }

      const finalUrl = urlObj.toString();

      // Execute request
      const response = await fetch(finalUrl, {
        method: op.method,
        headers,
        body: requestBody
      });

      const responseText = await response.text();
      let responseJson: any;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = { text: responseText };
      }

      if (!response.ok) {
        const errMsg = responseJson.message || responseJson.error || responseJson.title || responseText.slice(0, 300);
        throw new Error(`${this.name} API error (${response.status}): ${errMsg}`);
      }

      // Extract items or payload
      if (op.itemsPath && op.itemsPath.trim()) {
        const parts = op.itemsPath.split('.');
        let current = responseJson;
        for (const p of parts) {
          if (current && typeof current === 'object' && p in current) {
            current = current[p];
          } else {
            current = [];
            break;
          }
        }
        if (Array.isArray(current)) {
          for (const subItem of current) {
            results.push({ json: subItem, pairedItem: i });
          }
        } else {
          results.push({ json: current || responseJson, pairedItem: i });
        }
      } else if (Array.isArray(responseJson)) {
        for (const subItem of responseJson) {
          results.push({ json: subItem, pairedItem: i });
        }
      } else {
        results.push({ json: responseJson, pairedItem: i });
      }
    }

    return [results];
  }
}
