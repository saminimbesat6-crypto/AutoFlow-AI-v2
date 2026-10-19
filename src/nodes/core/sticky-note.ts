import { BaseNode } from '../base';
import { NodeOutput, PortDefinition, PropertyDefinition } from '../../types/workflow';
import { NodeExecutionContext } from '../../engine/context';

export class StickyNoteNode extends BaseNode {
  type = 'sticky-note';
  name = 'Sticky Note';
  description = 'Adds formatted notes, documentation, and visual groupings to the workflow canvas';
  category = 'core' as const;
  icon = 'file-text';
  color = '#f59e0b'; // Amber

  inputs: PortDefinition[] = [];
  outputs: PortDefinition[] = [];

  properties: PropertyDefinition[] = [
    {
      name: 'content',
      displayName: 'Note Content',
      type: 'string',
      default: '## Workflow Documentation\nAdd instructions, section titles, or notes here.',
      description: 'Markdown formatted text displayed directly on the workflow canvas'
    },
    {
      name: 'color',
      displayName: 'Color Theme',
      type: 'options',
      default: 'yellow',
      options: [
        { name: 'Yellow (Default)', value: 'yellow' },
        { name: 'Blue', value: 'blue' },
        { name: 'Green', value: 'green' },
        { name: 'Red', value: 'red' },
        { name: 'Purple', value: 'purple' },
        { name: 'Orange', value: 'orange' },
        { name: 'Slate Gray', value: 'gray' }
      ]
    },
    {
      name: 'width',
      displayName: 'Width (px)',
      type: 'number',
      default: 320,
      description: 'Width of the sticky note on the canvas'
    },
    {
      name: 'height',
      displayName: 'Height (px)',
      type: 'number',
      default: 200,
      description: 'Height of the sticky note on the canvas'
    }
  ];

  async execute(_context: NodeExecutionContext): Promise<NodeOutput> {
    // Sticky notes are visual canvas annotations and do not alter pipeline data streams
    return [[]];
  }
}
