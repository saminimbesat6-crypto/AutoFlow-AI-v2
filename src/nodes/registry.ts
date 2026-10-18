import { BaseNode, INodeDefinition } from './base';
import { ManualTriggerNode } from './triggers/manual-trigger';
import { WebhookTriggerNode } from './triggers/webhook-trigger';
import { ScheduleTriggerNode } from './triggers/schedule-trigger';
import { EmailTriggerNode } from './triggers/email-trigger';
import { ErrorTriggerNode } from './triggers/error-trigger';

import { HttpRequestNode } from './core/http-request';
import { IfConditionNode } from './core/if-condition';
import { SwitchNode } from './core/switch';
import { LoopNode } from './core/loop';
import { WaitNode } from './core/wait';
import { SetDataNode } from './core/set-data';
import { MergeNode } from './core/merge';
import { CodeNode } from './core/code';
import { FilterNode } from './core/filter';
import { DelayNode } from './core/delay';
import { CryptoNode } from './core/crypto';
import { WebhookResponseNode } from './core/webhook-response';
import { ExecuteWorkflowNode } from './core/execute-workflow';
import { ReadWriteFileNode } from './core/file';
import { ExtractFromFileNode } from './core/extract-file';

import { TelegramNode } from './apps/telegram';
import { DiscordNode } from './apps/discord';
import { EmailNode } from './apps/email';
import { WhatsAppNode } from './apps/whatsapp';
import { InstagramNode } from './apps/instagram';
import { SlackNode } from './apps/slack';
import { GoogleSheetsNode } from './apps/google-sheets';
import { AirtableNode } from './apps/airtable';
import { GitHubNode } from './apps/github';
import { StripeNode } from './apps/stripe';

import { GeminiNode } from './ai/gemini-node';
import { AiAgentNode } from './ai/ai-agent-node';

export class NodeRegistry {
  private static instance: NodeRegistry;
  private nodes: Map<string, BaseNode> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  private registerDefaults(): void {
    // Triggers
    this.register(new ManualTriggerNode());
    this.register(new WebhookTriggerNode());
    this.register(new ScheduleTriggerNode());
    this.register(new EmailTriggerNode());
    this.register(new ErrorTriggerNode());

    // Core Control Flow & Execution Logic
    this.register(new HttpRequestNode());
    this.register(new IfConditionNode());
    this.register(new SwitchNode());
    this.register(new LoopNode());
    this.register(new FilterNode());
    this.register(new DelayNode());
    this.register(new WaitNode());
    this.register(new SetDataNode());
    this.register(new MergeNode());
    this.register(new CodeNode());
    this.register(new CryptoNode());
    this.register(new WebhookResponseNode());
    this.register(new ExecuteWorkflowNode());
    this.register(new ReadWriteFileNode());
    this.register(new ExtractFromFileNode());

    // Apps & Social Connectors
    this.register(new TelegramNode());
    this.register(new DiscordNode());
    this.register(new EmailNode());
    this.register(new WhatsAppNode());
    this.register(new InstagramNode());
    this.register(new SlackNode());
    this.register(new GoogleSheetsNode());
    this.register(new AirtableNode());
    this.register(new GitHubNode());
    this.register(new StripeNode());

    // AI & Gemini
    this.register(new GeminiNode());
    this.register(new AiAgentNode());
  }

  register(node: BaseNode): void {
    this.nodes.set(node.type, node);
  }

  get(type: string): BaseNode | undefined {
    return this.nodes.get(type);
  }

  list(): Array<Omit<INodeDefinition, 'execute'>> {
    return Array.from(this.nodes.values()).map((node) => ({
      type: node.type,
      name: node.name,
      description: node.description,
      category: node.category,
      icon: node.icon,
      color: node.color,
      inputs: node.inputs,
      outputs: node.outputs,
      properties: node.properties
    }));
  }
}
