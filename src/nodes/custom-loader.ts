import fs from 'fs';
import path from 'path';
import { NodeRegistry } from './registry';
import { BaseNode, INodeDefinition } from './base';

export interface CustomNodeMetadata {
  type: string;
  name: string;
  description: string;
  category: string;
  version: string;
  filePath: string;
  loadedAt: string;
  status: 'active' | 'error';
  errorMessage?: string;
}

export class CustomNodeLoader {
  private static instance: CustomNodeLoader;
  private customDir: string;
  private loadedCustomNodes: Map<string, CustomNodeMetadata> = new Map();

  private constructor() {
    this.customDir = process.env.CUSTOM_NODES_DIR || path.join(process.cwd(), 'custom-nodes');
    this.ensureDirectory();
  }

  static getInstance(): CustomNodeLoader {
    if (!CustomNodeLoader.instance) {
      CustomNodeLoader.instance = new CustomNodeLoader();
    }
    return CustomNodeLoader.instance;
  }

  getCustomNodesDirectory(): string {
    return this.customDir;
  }

  private ensureDirectory(): void {
    try {
      if (!fs.existsSync(this.customDir)) {
        fs.mkdirSync(this.customDir, { recursive: true });
      }
    } catch (err: any) {
      console.warn(`[CustomNodeLoader] Warning: Unable to create custom nodes directory ${this.customDir}:`, err.message);
    }
  }

  /**
   * Scans and loads all custom nodes from the custom-nodes directory
   */
  async loadAll(): Promise<{ loaded: number; failed: number; nodes: CustomNodeMetadata[] }> {
    this.ensureDirectory();
    let loaded = 0;
    let failed = 0;

    try {
      if (!fs.existsSync(this.customDir)) {
        return { loaded: 0, failed: 0, nodes: [] };
      }

      const entries = fs.readdirSync(this.customDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(this.customDir, entry.name);

        if (entry.isFile() && (entry.name.endsWith('.node.js') || entry.name.endsWith('.node.ts') || entry.name.endsWith('.js'))) {
          try {
            await this.loadFromFile(fullPath);
            loaded++;
          } catch (err: any) {
            failed++;
            console.error(`[CustomNodeLoader] Failed to load node file ${entry.name}:`, err.message);
          }
        } else if (entry.isDirectory()) {
          // Check for node package / package.json or index.js
          const pkgPath = path.join(fullPath, 'package.json');
          const indexPath = path.join(fullPath, 'index.js');

          if (fs.existsSync(pkgPath)) {
            try {
              const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
              const nodeFiles: string[] = pkgJson.autoflow?.nodes || pkgJson.n8n?.nodes || (pkgJson.main ? [pkgJson.main] : []);
              for (const relFile of nodeFiles) {
                const targetPath = path.join(fullPath, relFile);
                if (fs.existsSync(targetPath)) {
                  await this.loadFromFile(targetPath);
                  loaded++;
                }
              }
            } catch (err: any) {
              failed++;
              console.error(`[CustomNodeLoader] Error loading custom node directory ${entry.name}:`, err.message);
            }
          } else if (fs.existsSync(indexPath)) {
            try {
              await this.loadFromFile(indexPath);
              loaded++;
            } catch (err: any) {
              failed++;
              console.error(`[CustomNodeLoader] Error loading ${indexPath}:`, err.message);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[CustomNodeLoader] Error scanning custom nodes:', err.message);
    }

    return {
      loaded,
      failed,
      nodes: Array.from(this.loadedCustomNodes.values())
    };
  }

  /**
   * Loads and validates a node from a specific file path
   */
  async loadFromFile(filePath: string): Promise<BaseNode> {
    // Delete require cache if already loaded to allow hot reloading
    const resolvedPath = path.resolve(filePath);
    if (require.cache[resolvedPath]) {
      delete require.cache[resolvedPath];
    }

    let nodeModule: any;
    try {
      nodeModule = require(resolvedPath);
    } catch (err: any) {
      throw new Error(`Failed to require custom node module at "${filePath}": ${err.message}`);
    }

    // Determine the export: default, class, or named export
    let NodeClassOrInstance = nodeModule.default || nodeModule;

    // Check for named class exports (e.g. export class CustomApiNode extends BaseNode)
    if (typeof NodeClassOrInstance !== 'function' && typeof NodeClassOrInstance !== 'object') {
      const keys = Object.keys(nodeModule);
      for (const k of keys) {
        if (typeof nodeModule[k] === 'function' || (typeof nodeModule[k] === 'object' && nodeModule[k]?.execute)) {
          NodeClassOrInstance = nodeModule[k];
          break;
        }
      }
    }

    let instance: any;
    if (typeof NodeClassOrInstance === 'function') {
      try {
        instance = new NodeClassOrInstance();
      } catch (err: any) {
        throw new Error(`Failed to instantiate node class from "${filePath}": ${err.message}`);
      }
    } else if (typeof NodeClassOrInstance === 'object') {
      instance = NodeClassOrInstance;
    }

    this.validateNodeInstance(instance, filePath);

    // Register with main registry
    NodeRegistry.getInstance().register(instance);

    const meta: CustomNodeMetadata = {
      type: instance.type,
      name: instance.name,
      description: instance.description || '',
      category: instance.category || 'app',
      version: instance.version || '1.0.0',
      filePath: resolvedPath,
      loadedAt: new Date().toISOString(),
      status: 'active'
    };

    this.loadedCustomNodes.set(instance.type, meta);
    return instance;
  }

  /**
   * Validates that the custom node conforms to INodeDefinition
   */
  private validateNodeInstance(instance: any, source: string): void {
    if (!instance) {
      throw new Error(`Custom node from "${source}" exported null or undefined.`);
    }
    if (!instance.type || typeof instance.type !== 'string') {
      throw new Error(`Custom node from "${source}" is missing required string property "type".`);
    }
    if (!instance.name || typeof instance.name !== 'string') {
      throw new Error(`Custom node "${instance.type}" is missing required string property "name".`);
    }
    if (typeof instance.execute !== 'function') {
      throw new Error(`Custom node "${instance.type}" must implement an "execute(context)" method.`);
    }
    if (!Array.isArray(instance.inputs)) {
      instance.inputs = [{ name: 'main', type: 'main', label: 'Input' }];
    }
    if (!Array.isArray(instance.outputs)) {
      instance.outputs = [{ name: 'main', type: 'main', label: 'Output' }];
    }
    if (!Array.isArray(instance.properties)) {
      instance.properties = [];
    }
    if (!instance.category) {
      instance.category = 'app';
    }
    if (!instance.icon) {
      instance.icon = 'package';
    }
    if (!instance.color) {
      instance.color = '#10b981';
    }
  }

  /**
   * Installs or saves a custom node from code into custom-nodes directory and loads it
   */
  async installNode(fileName: string, codeContent: string): Promise<CustomNodeMetadata> {
    this.ensureDirectory();
    const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9_\-\.]/g, '');
    const finalFileName = safeName.endsWith('.js') ? safeName : `${safeName}.node.js`;
    const targetPath = path.join(this.customDir, finalFileName);

    fs.writeFileSync(targetPath, codeContent, 'utf-8');
    const nodeInstance = await this.loadFromFile(targetPath);

    return this.loadedCustomNodes.get(nodeInstance.type)!;
  }

  /**
   * Returns list of loaded custom node metadata
   */
  listCustomNodes(): CustomNodeMetadata[] {
    return Array.from(this.loadedCustomNodes.values());
  }
}
