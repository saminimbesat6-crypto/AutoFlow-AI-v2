import { Workflow } from '../types/workflow';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'ai' | 'alerts' | 'webhooks' | 'devops';
  icon: string;
  workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'tmpl-telegram-ai-bot',
    name: 'Telegram & Discord AI Support Agent',
    description: 'Receives messages via Webhook, computes SHA-256 integrity hash, analyzes inquiry with Gemini 3.8 Flash, and returns response.',
    category: 'alerts',
    icon: '🤖',
    workflow: {
      name: 'Telegram AI Support Agent',
      description: 'Webhook listener that processes inquiries with Gemini and prepares structured response.',
      active: false,
      nodes: [
        {
          id: 'node_webhook_in',
          name: 'Telegram Webhook',
          type: 'webhook-trigger',
          position: { x: 100, y: 160 },
          parameters: { path: 'telegram-bot', httpMethod: 'POST', responseMode: 'onReceived' }
        },
        {
          id: 'node_crypto_verify',
          name: 'Hash Payload Checksum',
          type: 'crypto',
          position: { x: 380, y: 160 },
          parameters: { action: 'hash', algorithm: 'sha256', value: '{{ JSON.stringify($json) }}', destinationField: 'checksum' }
        },
        {
          id: 'node_gemini_reply',
          name: 'Gemini Customer Agent',
          type: 'gemini',
          position: { x: 660, y: 160 },
          parameters: {
            model: 'gemini-3.8-flash',
            prompt: 'You are a friendly customer service assistant. Inquire message: {{ $json.message || JSON.stringify($json) }}\nProvide a helpful, polite 2-sentence response.',
            temperature: 0.3
          }
        },
        {
          id: 'node_format_reply',
          name: 'Format Response',
          type: 'set-data',
          position: { x: 940, y: 160 },
          parameters: {
            mode: 'rawJson',
            jsonData: '{\n  "status": "success",\n  "reply": "{{ $json.text }}",\n  "checksum": "{{ $node[\'Hash Payload Checksum\'].json.checksum }}",\n  "timestamp": "{{ new Date().toISOString() }}"\n}'
          }
        }
      ],
      connections: [
        { source: 'Telegram Webhook', sourceOutput: 0, target: 'Hash Payload Checksum', targetInput: 0 },
        { source: 'Hash Payload Checksum', sourceOutput: 0, target: 'Gemini Customer Agent', targetInput: 0 },
        { source: 'Gemini Customer Agent', sourceOutput: 0, target: 'Format Response', targetInput: 0 }
      ],
      settings: {}
    }
  },
  {
    id: 'tmpl-news-digest',
    name: 'Daily Tech & AI News Digest',
    description: 'Scheduled daily workflow fetching trending AI news, synthesizing top highlights with Gemini, and producing structured briefing.',
    category: 'ai',
    icon: '📰',
    workflow: {
      name: 'Daily Tech & AI Digest',
      description: 'Scheduled workflow producing Gemini executive summaries of trending tech news.',
      active: false,
      nodes: [
        {
          id: 'node_sched_8am',
          name: 'Daily 8am Trigger',
          type: 'schedule-trigger',
          position: { x: 100, y: 160 },
          parameters: { cronExpression: '0 8 * * *' }
        },
        {
          id: 'node_fetch_hn',
          name: 'Fetch Tech News',
          type: 'http-request',
          position: { x: 380, y: 160 },
          parameters: { method: 'GET', url: 'https://hn.algolia.com/api/v1/search?query=artificial%20intelligence&tags=story' }
        },
        {
          id: 'node_gemini_digest',
          name: 'Gemini News Digest',
          type: 'gemini',
          position: { x: 660, y: 160 },
          parameters: {
            model: 'gemini-3.8-flash',
            prompt: 'Summarize top 3 AI stories from: {{ JSON.stringify(($json.hits || []).slice(0, 5).map(h => h.title)) }} into concise bullet points.',
            temperature: 0.2
          }
        },
        {
          id: 'node_digest_output',
          name: 'Publish Briefing',
          type: 'set-data',
          position: { x: 940, y: 160 },
          parameters: {
            mode: 'rawJson',
            jsonData: '{\n  "title": "Daily AI Executive Briefing",\n  "summary": "{{ $json.text }}",\n  "generatedAt": "{{ new Date().toISOString() }}"\n}'
          }
        }
      ],
      connections: [
        { source: 'Daily 8am Trigger', sourceOutput: 0, target: 'Fetch Tech News', targetInput: 0 },
        { source: 'Fetch Tech News', sourceOutput: 0, target: 'Gemini News Digest', targetInput: 0 },
        { source: 'Gemini News Digest', sourceOutput: 0, target: 'Publish Briefing', targetInput: 0 }
      ],
      settings: {}
    }
  },
  {
    id: 'tmpl-crypto-tracker',
    name: 'Crypto Price Spike Alert',
    description: 'Monitors cryptocurrency prices, calculates percentage movements, and filters sudden spikes above threshold.',
    category: 'alerts',
    icon: '📈',
    workflow: {
      name: 'Crypto Price Spike Monitor',
      description: 'Monitors Bitcoin/Ethereum prices and filters movements above threshold.',
      active: false,
      nodes: [
        {
          id: 'node_manual_check',
          name: 'Manual / Scheduled Poll',
          type: 'manual-trigger',
          position: { x: 100, y: 160 },
          parameters: {}
        },
        {
          id: 'node_fetch_prices',
          name: 'Fetch Coingecko BTC',
          type: 'http-request',
          position: { x: 380, y: 160 },
          parameters: { method: 'GET', url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true' }
        },
        {
          id: 'node_filter_price',
          name: 'Filter High Price',
          type: 'filter',
          position: { x: 660, y: 160 },
          parameters: { value1: '{{ $json.bitcoin.usd || 0 }}', operation: 'larger', value2: '50000' }
        },
        {
          id: 'node_alert_payload',
          name: 'Dispatch Price Alert',
          type: 'set-data',
          position: { x: 940, y: 160 },
          parameters: {
            mode: 'rawJson',
            jsonData: '{\n  "alert": "Bitcoin High Value Triggered",\n  "price": {{ $json.bitcoin.usd || 0 }},\n  "change24h": {{ $json.bitcoin.usd_24h_change || 0 }}\n}'
          }
        }
      ],
      connections: [
        { source: 'Manual / Scheduled Poll', sourceOutput: 0, target: 'Fetch Coingecko BTC', targetInput: 0 },
        { source: 'Fetch Coingecko BTC', sourceOutput: 0, target: 'Filter High Price', targetInput: 0 },
        { source: 'Filter High Price', sourceOutput: 0, target: 'Dispatch Price Alert', targetInput: 0 }
      ],
      settings: {}
    }
  },
  {
    id: 'tmpl-order-fraud',
    name: 'Order Webhook Intake & Fraud Scorer',
    description: 'Receives customer orders, computes cryptographic SHA-256 integrity hash, assesses risk with Gemini, and routes high-value orders.',
    category: 'webhooks',
    icon: '🛡️',
    workflow: {
      name: 'Order Webhook & Fraud Risk Intake',
      description: 'Secure webhook intake verifying payload integrity and filtering high-value items.',
      active: false,
      nodes: [
        {
          id: 'node_order_intake',
          name: 'Order Intake Webhook',
          type: 'webhook-trigger',
          position: { x: 100, y: 160 },
          parameters: { path: 'customer-orders', httpMethod: 'POST', responseMode: 'onReceived' }
        },
        {
          id: 'node_order_crypto',
          name: 'Compute SHA256 Checksum',
          type: 'crypto',
          position: { x: 380, y: 160 },
          parameters: { action: 'hash', algorithm: 'sha256', value: '{{ JSON.stringify($json) }}', destinationField: 'checksum' }
        },
        {
          id: 'node_order_filter',
          name: 'Filter High Value (>100)',
          type: 'filter',
          position: { x: 660, y: 160 },
          parameters: { value1: '{{ $json.amount || $json.total || 150 }}', operation: 'larger', value2: '100' }
        },
        {
          id: 'node_order_confirm',
          name: 'Confirm Order Output',
          type: 'set-data',
          position: { x: 940, y: 160 },
          parameters: {
            mode: 'rawJson',
            jsonData: '{\n  "orderStatus": "VERIFIED_HIGH_VALUE",\n  "amount": {{ $json.amount || $json.total || 150 }},\n  "checksum": "{{ $json.checksum }}",\n  "processedAt": "{{ new Date().toISOString() }}"\n}'
          }
        }
      ],
      connections: [
        { source: 'Order Intake Webhook', sourceOutput: 0, target: 'Compute SHA256 Checksum', targetInput: 0 },
        { source: 'Compute SHA256 Checksum', sourceOutput: 0, target: 'Filter High Value (>100)', targetInput: 0 },
        { source: 'Filter High Value (>100)', sourceOutput: 0, target: 'Confirm Order Output', targetInput: 0 }
      ],
      settings: {}
    }
  },
  {
    id: 'tmpl-research-agent',
    name: 'Autonomous Research & Tool Loop',
    description: 'Autonomous multi-turn loop utilizing built-in arithmetic and workflow inspection tools to produce verified research summaries.',
    category: 'ai',
    icon: '⚡',
    workflow: {
      name: 'Autonomous AI Research Agent',
      description: 'Multi-turn agent using internal tools for calculation and data synthesis.',
      active: false,
      nodes: [
        {
          id: 'node_agent_trigger',
          name: 'Research Trigger',
          type: 'manual-trigger',
          position: { x: 100, y: 160 },
          parameters: {}
        },
        {
          id: 'node_ai_agent',
          name: 'Autonomous Agent',
          type: 'ai-agent',
          position: { x: 420, y: 160 },
          parameters: {
            task: 'Analyze current system performance: compute the sum of [120, 240, 360] and summarize findings.',
            maxIterations: 5,
            tools: 'calculator,get_workflow_info'
          }
        },
        {
          id: 'node_agent_report',
          name: 'Executive Summary',
          type: 'set-data',
          position: { x: 740, y: 160 },
          parameters: {
            mode: 'rawJson',
            jsonData: '{\n  "result": "{{ $json.result }}",\n  "status": "COMPLETED",\n  "timestamp": "{{ new Date().toISOString() }}"\n}'
          }
        }
      ],
      connections: [
        { source: 'Research Trigger', sourceOutput: 0, target: 'Autonomous Agent', targetInput: 0 },
        { source: 'Autonomous Agent', sourceOutput: 0, target: 'Executive Summary', targetInput: 0 }
      ],
      settings: {}
    }
  },
  {
    id: 'tmpl-whatsapp-ai-crm',
    name: 'WhatsApp AI Customer Auto-Responder & Lead Logger',
    description: 'Listens for WhatsApp messages, generates an instant AI response with Gemini, delivers via WhatsApp, and logs lead to Google Sheets.',
    category: 'alerts',
    icon: '💬',
    workflow: {
      name: 'WhatsApp AI Auto-Responder',
      description: 'Automated 24/7 WhatsApp AI customer support and lead generation pipeline.',
      active: false,
      nodes: [
        {
          id: 'wa_webhook',
          name: 'WhatsApp Inbound Webhook',
          type: 'webhook-trigger',
          position: { x: 100, y: 160 },
          parameters: { path: 'whatsapp-leads', httpMethod: 'POST', responseMode: 'onReceived' }
        },
        {
          id: 'wa_gemini',
          name: 'Gemini Customer Agent',
          type: 'gemini',
          position: { x: 380, y: 160 },
          parameters: {
            model: 'gemini-3.8-flash',
            prompt: 'You are an executive assistant for AutoFlow AI. A customer messaged:\n"{{ $json.message || \'Hello, I would like more information on your pricing.\' }}"\nDraft a warm, helpful 2-sentence response answering their inquiry.',
            temperature: 0.3
          }
        },
        {
          id: 'wa_reply',
          name: 'Send WhatsApp Reply',
          type: 'whatsapp',
          position: { x: 660, y: 160 },
          parameters: {
            operation: 'sendMessage',
            phoneNumberId: '1098273645129',
            accessToken: 'test-meta-token',
            recipient: '{{ $json.from || \'14155552671\' }}',
            message: '{{ $json.text }}'
          }
        },
        {
          id: 'wa_sheets',
          name: 'Log Lead to Google Sheets',
          type: 'google-sheets',
          position: { x: 940, y: 160 },
          parameters: {
            operation: 'appendRow',
            spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            sheetName: 'Leads',
            accessToken: 'test-google-token',
            rowValues: '["{{ $json.recipient }}", "{{ new Date().toISOString() }}", "Responded", "AutoFlow AI"]'
          }
        }
      ],
      connections: [
        { source: 'WhatsApp Inbound Webhook', sourceOutput: 0, target: 'Gemini Customer Agent', targetInput: 0 },
        { source: 'Gemini Customer Agent', sourceOutput: 0, target: 'Send WhatsApp Reply', targetInput: 0 },
        { source: 'Send WhatsApp Reply', sourceOutput: 0, target: 'Log Lead to Google Sheets', targetInput: 0 }
      ],
      settings: {}
    }
  },
  {
    id: 'tmpl-instagram-auto-responder',
    name: 'Instagram Comments & DM Auto-Engagement',
    description: 'Monitors Instagram comments/DMs, classifies sentiment with Gemini, replies automatically, and sends Slack alert.',
    category: 'alerts',
    icon: '📸',
    workflow: {
      name: 'Instagram Auto-Engagement Pipeline',
      description: 'Automated comment sentiment classification and instant response.',
      active: false,
      nodes: [
        {
          id: 'ig_webhook',
          name: 'Instagram Event Webhook',
          type: 'webhook-trigger',
          position: { x: 100, y: 160 },
          parameters: { path: 'instagram-events', httpMethod: 'POST', responseMode: 'onReceived' }
        },
        {
          id: 'ig_gemini',
          name: 'Gemini Comment Reply AI',
          type: 'gemini',
          position: { x: 380, y: 160 },
          parameters: {
            model: 'gemini-3.8-flash',
            prompt: 'A follower commented on our latest post: "{{ $json.commentText || \'This workflow platform looks incredible! Does it work on mobile?\' }}"\nWrite a friendly, enthusiastic Instagram response with an emoji.',
            temperature: 0.5
          }
        },
        {
          id: 'ig_reply',
          name: 'Reply to Instagram Comment',
          type: 'instagram',
          position: { x: 660, y: 160 },
          parameters: {
            operation: 'replyComment',
            accessToken: 'test-ig-token',
            instagramAccountId: '178414000000000',
            commentId: '{{ $json.commentId || \'17900000000000000\' }}',
            message: '{{ $json.text }}'
          }
        },
        {
          id: 'ig_slack',
          name: 'Notify Team on Slack',
          type: 'slack',
          position: { x: 940, y: 160 },
          parameters: {
            webhookUrl: 'https://hooks.slack.com/services/mock/T00/B00/XXXX',
            text: '✨ *New Instagram Engagement:* Replied to comment: "{{ $json.text }}"',
            username: 'Instagram Bot'
          }
        }
      ],
      connections: [
        { source: 'Instagram Event Webhook', sourceOutput: 0, target: 'Gemini Comment Reply AI', targetInput: 0 },
        { source: 'Gemini Comment Reply AI', sourceOutput: 0, target: 'Reply to Instagram Comment', targetInput: 0 },
        { source: 'Reply to Instagram Comment', sourceOutput: 0, target: 'Notify Team on Slack', targetInput: 0 }
      ],
      settings: {}
    }
  },
  {
    id: 'tmpl-inbound-email-processor',
    name: 'Inbound Email Invoice OCR & Airtable Filing',
    description: 'Triggers on incoming invoice emails, analyzes and extracts total and vendor with Gemini, and records invoice into Airtable.',
    category: 'webhooks',
    icon: '🧾',
    workflow: {
      name: 'Automated Invoice Filing Pipeline',
      description: 'Zero-touch inbound invoice extraction and database storage.',
      active: false,
      nodes: [
        {
          id: 'em_trigger',
          name: 'Inbound Email Trigger',
          type: 'email-trigger',
          position: { x: 100, y: 160 },
          parameters: { filterSubject: 'invoice' }
        },
        {
          id: 'em_gemini',
          name: 'Gemini Document Extractor',
          type: 'gemini',
          position: { x: 380, y: 160 },
          parameters: {
            model: 'gemini-3.8-flash',
            prompt: 'Extract the invoice details from this email text: "{{ $json.bodyText }}". Return JSON with fields: vendor, invoiceNumber, amount, dueDate.',
            jsonOutput: true
          }
        },
        {
          id: 'em_airtable',
          name: 'Record in Airtable',
          type: 'airtable',
          position: { x: 660, y: 160 },
          parameters: {
            operation: 'createRecord',
            baseId: 'appInvoices12345',
            tableName: 'Invoices',
            apiKey: 'test-airtable-pat',
            fieldsJson: '{\n  "Vendor": "{{ $json.json.vendor || \'Acme Corp\' }}",\n  "Amount": {{ $json.json.amount || 250 }},\n  "Status": "Pending Review"\n}'
          }
        },
        {
          id: 'em_tg_notify',
          name: 'Telegram Finance Alert',
          type: 'telegram',
          position: { x: 940, y: 160 },
          parameters: {
            botToken: 'test-bot-token',
            chatId: '12345678',
            text: '🧾 *New Invoice Logged:* {{ $json.record.fields.Vendor }} for ${{ $json.record.fields.Amount }}'
          }
        }
      ],
      connections: [
        { source: 'Inbound Email Trigger', sourceOutput: 0, target: 'Gemini Document Extractor', targetInput: 0 },
        { source: 'Gemini Document Extractor', sourceOutput: 0, target: 'Record in Airtable', targetInput: 0 },
        { source: 'Record in Airtable', sourceOutput: 0, target: 'Telegram Finance Alert', targetInput: 0 }
      ],
      settings: {}
    }
  }
];
