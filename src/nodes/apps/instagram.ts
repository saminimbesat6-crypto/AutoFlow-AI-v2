import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class InstagramNode extends BaseNode {
  type = 'instagram';
  name = 'Instagram for Business';
  description = 'Automate Instagram Direct Messages, comment auto-replies, and media publishing';
  category = 'app' as const;
  icon = 'instagram';
  color = '#E1306C'; // Instagram Pink

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
      default: 'sendDirectMessage',
      options: [
        { name: 'Send Direct Message (DM)', value: 'sendDirectMessage', description: 'Send a message to an Instagram user' },
        { name: 'Reply to Comment', value: 'replyComment', description: 'Reply to a comment on your post/reel' },
        { name: 'Publish Photo Post', value: 'publishMedia', description: 'Create and publish a photo post container' }
      ]
    },
    {
      name: 'accessToken',
      displayName: 'Access Token',
      type: 'string',
      required: true,
      description: 'Meta Graph API User or Page Access Token with Instagram permissions'
    },
    {
      name: 'instagramAccountId',
      displayName: 'Instagram Account ID',
      type: 'string',
      required: true,
      description: 'Your Instagram Professional / Business Account ID'
    },
    {
      name: 'recipientId',
      displayName: 'Recipient ID (IGSID)',
      type: 'string',
      description: 'Instagram-scoped User ID for Direct Messages (e.g. {{ $json.senderId }})'
    },
    {
      name: 'commentId',
      displayName: 'Comment ID',
      type: 'string',
      description: 'ID of the comment to reply to (e.g. {{ $json.commentId }})'
    },
    {
      name: 'message',
      displayName: 'Message / Reply Text',
      type: 'string',
      description: 'Text content to send as DM or comment reply'
    },
    {
      name: 'imageUrl',
      displayName: 'Image URL',
      type: 'string',
      description: 'Public URL of the photo to publish'
    },
    {
      name: 'caption',
      displayName: 'Caption',
      type: 'string',
      description: 'Caption for the published Instagram post'
    }
  ];

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    const results: DataItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = context.getNodeParameter('operation', i, 'sendDirectMessage');
      const accessToken = context.getNodeParameter('accessToken', i, '');
      const igAccountId = context.getNodeParameter('instagramAccountId', i, '');
      const recipientId = context.getNodeParameter('recipientId', i, '');
      const commentId = context.getNodeParameter('commentId', i, '');
      const message = context.getNodeParameter('message', i, '');
      const imageUrl = context.getNodeParameter('imageUrl', i, '');
      const caption = context.getNodeParameter('caption', i, '');

      if (!accessToken) {
        throw new Error('Instagram node requires a Meta Graph API Access Token.');
      }
      if (!igAccountId) {
        throw new Error('Instagram node requires an Instagram Account ID.');
      }

      // Handle Sandbox / Mock testing
      if (accessToken.startsWith('test-') || accessToken.includes('mock') || accessToken === 'sandbox') {
        results.push({
          json: {
            success: true,
            operation,
            status: 'success',
            targetId: recipientId || commentId || igAccountId,
            message: message || caption,
            timestamp: new Date().toISOString(),
            mock: true
          }
        });
        continue;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        let endpoint = '';
        let payload: Record<string, any> = {};

        if (operation === 'sendDirectMessage') {
          if (!recipientId) throw new Error('Recipient ID is required for Instagram Direct Messages.');
          endpoint = `https://graph.facebook.com/v20.0/${igAccountId}/messages`;
          payload = {
            recipient: { id: recipientId },
            message: { text: String(message || '') }
          };
        } else if (operation === 'replyComment') {
          if (!commentId) throw new Error('Comment ID is required to reply to a comment.');
          endpoint = `https://graph.facebook.com/v20.0/${commentId}/replies`;
          payload = {
            message: String(message || '')
          };
        } else if (operation === 'publishMedia') {
          if (!imageUrl) throw new Error('Image URL is required to publish media to Instagram.');
          // Step 1: Create container
          endpoint = `https://graph.facebook.com/v20.0/${igAccountId}/media`;
          payload = {
            image_url: imageUrl,
            caption: caption || undefined
          };
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeout);
        const data = await res.json() as any;

        if (!res.ok || data.error) {
          const errMsg = data.error?.message || `HTTP ${res.status}`;
          throw new Error(`Instagram API error: ${errMsg}`);
        }

        results.push({
          json: {
            success: true,
            operation,
            result: data,
            timestamp: new Date().toISOString()
          }
        });
      } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          throw new Error('Instagram API request timed out after 15 seconds.');
        }
        throw err;
      }
    }

    return [results];
  }
}
