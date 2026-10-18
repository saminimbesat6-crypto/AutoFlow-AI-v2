import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class GitHubNode extends BaseNode {
  type = 'github';
  name = 'GitHub';
  description = 'Automate GitHub issues, pull request comments, and workflow dispatch';
  category = 'app' as const;
  icon = 'github';
  color = '#24292e'; // GitHub Slate

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
      default: 'createIssue',
      options: [
        { name: 'Create Issue', value: 'createIssue' },
        { name: 'Add Issue Comment', value: 'addComment' },
        { name: 'Dispatch Workflow Event', value: 'dispatchWorkflow' }
      ]
    },
    {
      name: 'token',
      displayName: 'GitHub Personal Access Token',
      type: 'string',
      required: true,
      description: 'GitHub PAT (classic or fine-grained) with repo scope'
    },
    {
      name: 'owner',
      displayName: 'Repository Owner',
      type: 'string',
      required: true,
      description: 'User or Organization (e.g. saminimbesat6-crypto)'
    },
    {
      name: 'repo',
      displayName: 'Repository Name',
      type: 'string',
      required: true,
      description: 'Repository name (e.g. AutoFlow-AI-v2)'
    },
    {
      name: 'issueNumber',
      displayName: 'Issue / PR Number',
      type: 'number',
      description: 'Issue or PR number for comment operations'
    },
    {
      name: 'title',
      displayName: 'Title',
      type: 'string',
      description: 'Issue title'
    },
    {
      name: 'body',
      displayName: 'Body Content',
      type: 'string',
      description: 'Issue or comment markdown text'
    },
    {
      name: 'labels',
      displayName: 'Labels (Comma Separated)',
      type: 'string',
      description: 'e.g. bug, automated, ai-detected'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    const results: DataItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = context.getNodeParameter('operation', i, 'createIssue');
      const token = context.getNodeParameter('token', i, '');
      const owner = context.getNodeParameter('owner', i, '');
      const repo = context.getNodeParameter('repo', i, '');
      const issueNumber = context.getNodeParameter('issueNumber', i, 0);
      const title = context.getNodeParameter('title', i, '');
      const body = context.getNodeParameter('body', i, '');
      const labelsRaw = context.getNodeParameter('labels', i, '');

      if (!token) throw new Error('GitHub node requires a Personal Access Token.');
      if (!owner || !repo) throw new Error('GitHub node requires repository Owner and Name.');

      // Sandbox / Mock testing
      if (token.startsWith('test-') || token.includes('mock') || token === 'sandbox') {
        results.push({
          json: {
            success: true,
            operation,
            issueNumber: issueNumber || Math.floor(Math.random() * 100),
            html_url: `https://github.com/${owner}/${repo}/issues/42`,
            title,
            mock: true
          }
        });
        continue;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        let url = '';
        let method = 'POST';
        let payload: any = {};

        if (operation === 'createIssue') {
          url = `https://api.github.com/repos/${owner}/${repo}/issues`;
          const labels = labelsRaw ? String(labelsRaw).split(',').map((s) => s.trim()).filter(Boolean) : undefined;
          payload = { title: String(title || 'Automated Issue'), body: String(body || ''), labels };
        } else if (operation === 'addComment') {
          if (!issueNumber) throw new Error('Add Comment requires an Issue Number.');
          url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
          payload = { body: String(body || '') };
        } else if (operation === 'dispatchWorkflow') {
          url = `https://api.github.com/repos/${owner}/${repo}/dispatches`;
          payload = { event_type: title || 'autoflow_event', client_payload: { body } };
        }

        const res = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'AutoFlow-AI',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeout);
        const data = await res.json().catch(() => ({ status: res.status }));

        if (!res.ok) {
          const errMsg = data.message || `HTTP ${res.status}`;
          throw new Error(`GitHub API error: ${errMsg}`);
        }

        results.push({
          json: {
            success: true,
            operation,
            data
          }
        });
      } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          throw new Error('GitHub API request timed out after 15 seconds.');
        }
        throw err;
      }
    }

    return [results];
  }
}
