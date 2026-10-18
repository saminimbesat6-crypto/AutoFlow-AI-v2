import { BaseNode } from '../base';
import { DataItem, NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class DateTimeNode extends BaseNode {
  type = 'date-time';
  name = 'Date & Time';
  description = 'Formats, parses, adds, subtracts, and calculates durations between dates and timestamps';
  category = 'transform' as const;
  icon = 'clock';
  color = '#06b6d4'; // Cyan

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
      default: 'formatDate',
      options: [
        { name: 'Format a Date', value: 'formatDate', description: 'Convert date into a custom format or timezone' },
        { name: 'Add to a Date', value: 'addToDate', description: 'Add days, hours, or minutes to a date' },
        { name: 'Subtract from a Date', value: 'subtractFromDate', description: 'Subtract duration from a date' },
        { name: 'Time Between Dates', value: 'timeBetween', description: 'Calculate difference between two dates' },
        { name: 'Get Current Date & Time', value: 'currentDate', description: 'Output current timestamp' }
      ]
    },
    {
      name: 'date',
      displayName: 'Input Date',
      type: 'string',
      default: '{{ $json.date || $now }}',
      description: 'Date string or timestamp to manipulate (leave empty or $now for current time)'
    },
    {
      name: 'secondDate',
      displayName: 'Second Date (for Time Between)',
      type: 'string',
      default: '{{ $now }}',
      description: 'Second date to compare against'
    },
    {
      name: 'amount',
      displayName: 'Amount',
      type: 'number',
      default: 1,
      description: 'Value to add or subtract'
    },
    {
      name: 'unit',
      displayName: 'Time Unit',
      type: 'options',
      default: 'days',
      options: [
        { name: 'Days', value: 'days' },
        { name: 'Hours', value: 'hours' },
        { name: 'Minutes', value: 'minutes' },
        { name: 'Seconds', value: 'seconds' },
        { name: 'Weeks', value: 'weeks' },
        { name: 'Months', value: 'months' },
        { name: 'Years', value: 'years' }
      ]
    },
    {
      name: 'outputFormat',
      displayName: 'Output Format',
      type: 'options',
      default: 'YYYY-MM-DD HH:mm:ss',
      options: [
        { name: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' },
        { name: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
        { name: 'ISO 8601 (2026-10-19T03:00:00Z)', value: 'ISO' },
        { name: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
        { name: 'Unix Timestamp (Seconds)', value: 'unix' },
        { name: 'Unix Milliseconds', value: 'unixMs' }
      ]
    },
    {
      name: 'outputPropertyName',
      displayName: 'Output Property Name',
      type: 'string',
      default: 'formattedDate',
      description: 'Field name under which the processed date is saved in JSON'
    }
  ];

  private parseDate(val: any): Date {
    if (!val || val === '$now' || val === 'now') return new Date();
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      const num = Number(val);
      if (!isNaN(num)) return new Date(num);
      return new Date();
    }
    return d;
  }

  private applyFormat(d: Date, format: string): string | number {
    if (format === 'ISO') return d.toISOString();
    if (format === 'unix') return Math.floor(d.getTime() / 1000);
    if (format === 'unixMs') return d.getTime();

    const YYYY = d.getUTCFullYear();
    const MM = String(d.getUTCMonth() + 1).padStart(2, '0');
    const DD = String(d.getUTCDate()).padStart(2, '0');
    const HH = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');

    if (format === 'YYYY-MM-DD') return `${YYYY}-${MM}-${DD}`;
    if (format === 'MM/DD/YYYY') return `${MM}/${DD}/${YYYY}`;
    return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
  }

  private applyDelta(date: Date, amount: number, unit: string): Date {
    const d = new Date(date.getTime());
    switch (unit) {
      case 'seconds': d.setUTCSeconds(d.getUTCSeconds() + amount); break;
      case 'minutes': d.setUTCMinutes(d.getUTCMinutes() + amount); break;
      case 'hours': d.setUTCHours(d.getUTCHours() + amount); break;
      case 'days': d.setUTCDate(d.getUTCDate() + amount); break;
      case 'weeks': d.setUTCDate(d.getUTCDate() + amount * 7); break;
      case 'months': d.setUTCMonth(d.getUTCMonth() + amount); break;
      case 'years': d.setUTCFullYear(d.getUTCFullYear() + amount); break;
    }
    return d;
  }

  async execute(context: NodeExecutionContext): Promise<NodeOutput> {
    const items = context.inputData && context.inputData.length > 0
      ? context.inputData
      : [{ json: {} }];

    const results: DataItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = context.getNodeParameter('operation', i, 'formatDate');
      const dateStr = context.getNodeParameter('date', i, '$now');
      const secondDateStr = context.getNodeParameter('secondDate', i, '$now');
      const amount = Number(context.getNodeParameter('amount', i, 1));
      const unit = context.getNodeParameter('unit', i, 'days');
      const outputFormat = context.getNodeParameter('outputFormat', i, 'YYYY-MM-DD HH:mm:ss');
      const propName = context.getNodeParameter('outputPropertyName', i, 'formattedDate');

      const baseDate = this.parseDate(dateStr);
      let calculatedValue: any;

      if (operation === 'currentDate') {
        calculatedValue = this.applyFormat(new Date(), outputFormat);
      } else if (operation === 'formatDate') {
        calculatedValue = this.applyFormat(baseDate, outputFormat);
      } else if (operation === 'addToDate') {
        const adjusted = this.applyDelta(baseDate, amount, unit);
        calculatedValue = this.applyFormat(adjusted, outputFormat);
      } else if (operation === 'subtractFromDate') {
        const adjusted = this.applyDelta(baseDate, -amount, unit);
        calculatedValue = this.applyFormat(adjusted, outputFormat);
      } else if (operation === 'timeBetween') {
        const secondDate = this.parseDate(secondDateStr);
        const diffMs = Math.abs(secondDate.getTime() - baseDate.getTime());
        switch (unit) {
          case 'seconds': calculatedValue = Math.floor(diffMs / 1000); break;
          case 'minutes': calculatedValue = Math.floor(diffMs / (1000 * 60)); break;
          case 'hours': calculatedValue = Math.floor(diffMs / (1000 * 60 * 60)); break;
          case 'days': calculatedValue = Math.floor(diffMs / (1000 * 60 * 60 * 24)); break;
          default: calculatedValue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }
      }

      results.push({
        json: {
          ...items[i].json,
          [propName]: calculatedValue
        },
        binary: items[i].binary,
        pairedItem: i
      });
    }

    return [results];
  }
}
