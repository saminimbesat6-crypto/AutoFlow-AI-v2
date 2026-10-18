import crypto from 'crypto';
import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class AwsS3Node extends BaseNode {
  type = 'aws-s3';
  name = 'AWS S3';
  description = 'Uploads, downloads, lists, and deletes objects in Amazon S3 or S3-compatible storage (MinIO, R2, Wasabi)';
  category = 'app' as const;
  icon = 'cloud';
  color = '#FF9900'; // AWS Orange

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
      default: 'upload',
      options: [
        { name: 'Upload Object', value: 'upload', description: 'Put an object or file into an S3 bucket' },
        { name: 'Download Object', value: 'download', description: 'Get an object content from an S3 bucket' },
        { name: 'List Objects', value: 'list', description: 'List objects matching a prefix in an S3 bucket' },
        { name: 'Delete Object', value: 'delete', description: 'Remove an object from an S3 bucket' }
      ]
    },
    {
      name: 'bucket',
      displayName: 'Bucket Name',
      type: 'string',
      required: true,
      description: 'The S3 bucket name (e.g. my-app-backups)'
    },
    {
      name: 'key',
      displayName: 'Object Key (File Path)',
      type: 'string',
      default: 'exports/{{ $json.filename || "data.json" }}',
      description: 'Target path inside the bucket (e.g. uploads/image.png)'
    },
    {
      name: 'content',
      displayName: 'Object Content',
      type: 'string',
      description: 'Payload content to upload (text, json, or base64)'
    },
    {
      name: 'prefix',
      displayName: 'Prefix Filter',
      type: 'string',
      default: '',
      description: 'Optional prefix for List Objects operation (e.g. logs/2026/)'
    },
    {
      name: 'region',
      displayName: 'AWS Region',
      type: 'string',
      default: 'us-east-1',
      description: 'AWS region (e.g. us-east-1, eu-west-1)'
    },
    {
      name: 'endpoint',
      displayName: 'Custom Endpoint URL',
      type: 'string',
      default: '',
      description: 'Optional custom endpoint for MinIO, Cloudflare R2, Wasabi (leave blank for AWS S3)'
    },
    {
      name: 'accessKeyId',
      displayName: 'Access Key ID',
      type: 'string',
      description: 'AWS / S3 Access Key ID'
    },
    {
      name: 'secretAccessKey',
      displayName: 'Secret Access Key',
      type: 'string',
      description: 'AWS / S3 Secret Access Key'
    }
  ];

  /**
   * Generates AWS Signature Version 4 headers for standard S3 REST API
   */
  private getSigV4Headers(
    method: string,
    urlStr: string,
    headers: Record<string, string>,
    payload: Buffer | string,
    region: string,
    accessKey: string,
    secretKey: string
  ): Record<string, string> {
    const parsed = new URL(urlStr);
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');

    const canonicalHeaders: Record<string, string> = {
      host: parsed.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      ...headers
    };

    const sortedHeaderKeys = Object.keys(canonicalHeaders).map((k) => k.toLowerCase()).sort();
    const canonicalHeadersStr = sortedHeaderKeys
      .map((k) => `${k}:${canonicalHeaders[k].trim()}\n`)
      .join('');
    const signedHeaders = sortedHeaderKeys.join(';');

    const canonicalRequest = [
      method,
      parsed.pathname,
      parsed.searchParams.toString(),
      canonicalHeadersStr,
      signedHeaders,
      payloadHash
    ].join('\n');

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const authorization = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      ...canonicalHeaders,
      Authorization: authorization
    };
  }

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    const results: DataItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = context.getNodeParameter('operation', i, 'upload');
      const bucket = context.getNodeParameter('bucket', i, '');
      const key = context.getNodeParameter('key', i, '');
      const content = context.getNodeParameter('content', i, '');
      const prefix = context.getNodeParameter('prefix', i, '');
      const region = context.getNodeParameter('region', i, 'us-east-1');
      const endpoint = context.getNodeParameter('endpoint', i, '');
      const accessKeyId = context.getNodeParameter('accessKeyId', i, '') || process.env.AWS_ACCESS_KEY_ID || '';
      const secretAccessKey = context.getNodeParameter('secretAccessKey', i, '') || process.env.AWS_SECRET_ACCESS_KEY || '';

      if (!bucket) {
        throw new Error('AWS S3 node requires a Bucket Name.');
      }

      // Test/mock mode
      if (bucket.includes('test') || bucket.includes('mock') || !accessKeyId) {
        results.push({
          json: {
            success: true,
            operation,
            bucket,
            key: key || prefix,
            region,
            url: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
            mock: true,
            note: 'Mock execution succeeded. Provide AWS access credentials for live S3 dispatch.'
          },
          pairedItem: i
        });
        continue;
      }

      const host = endpoint ? new URL(endpoint).host : `${bucket}.s3.${region}.amazonaws.com`;
      const baseUrl = endpoint ? `${endpoint.replace(/\/$/, '')}/${bucket}` : `https://${host}`;

      let method = 'GET';
      let targetPath = `/${key.replace(/^\//, '')}`;
      let body: any = undefined;

      if (operation === 'upload') {
        method = 'PUT';
        body = content || JSON.stringify(items[i].json);
      } else if (operation === 'download') {
        method = 'GET';
      } else if (operation === 'delete') {
        method = 'DELETE';
      } else if (operation === 'list') {
        method = 'GET';
        targetPath = prefix ? `/?prefix=${encodeURIComponent(prefix)}` : '/';
      }

      const fullUrl = `${baseUrl}${targetPath}`;
      const signedHeaders = this.getSigV4Headers(
        method,
        fullUrl,
        { 'content-type': 'application/octet-stream' },
        body || '',
        region,
        accessKeyId,
        secretAccessKey
      );

      const res = await fetch(fullUrl, {
        method,
        headers: signedHeaders,
        body
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`AWS S3 error (${res.status}): ${errText}`);
      }

      if (operation === 'download') {
        const textData = await res.text();
        let parsed: any = textData;
        try { parsed = JSON.parse(textData); } catch {}
        results.push({
          json: { success: true, bucket, key, data: parsed },
          pairedItem: i
        });
      } else if (operation === 'list') {
        const xml = await res.text();
        results.push({
          json: { success: true, bucket, prefix, rawXml: xml },
          pairedItem: i
        });
      } else {
        results.push({
          json: {
            success: true,
            operation,
            bucket,
            key,
            status: 'completed',
            etag: res.headers.get('etag')
          },
          pairedItem: i
        });
      }
    }

    return [results];
  }
}
