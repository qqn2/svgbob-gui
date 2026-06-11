import type { EditorView } from '@codemirror/view';
import { insertAtCursor } from './editor';
import { focusTextTool } from './drawTools';

interface Snippet {
  label: string;
  title: string;
  text: string;
}

const SNIPPETS: Snippet[] = [
  {
    label: '[ box ]',
    title: 'Empty labeled box',
    text: '+----------+\n|  LABEL   |\n+----------+\n',
  },
  {
    label: '→',
    title: 'Right arrow',
    text: '---------->',
  },
  {
    label: '→ labeled',
    title: 'Labeled right arrow',
    text: '---[label]-->',
  },
  {
    label: '↓',
    title: 'Down arrow',
    text: '|\n|\nv\n',
  },
  {
    label: 'pipeline',
    title: '3-stage pipeline',
    text: [
      '+----------+     +----------+     +----------+',
      '|          |     |          |     |          |',
      '| STAGE 1  +---->| STAGE 2  +---->| STAGE 3  |',
      '|          |     |          |     |          |',
      '+----------+     +----------+     +----------+',
      '',
    ].join('\n'),
  },
  {
    label: 'reg/FF',
    title: 'D flip-flop / register',
    text: [
      '      +-------+',
      ' D -->|D     Q+---> Q',
      '      |  FF   |',
      'CLK ->|>      |',
      '      +-------+',
      '',
    ].join('\n'),
  },
  {
    label: 'mux 2:1',
    title: '2-to-1 multiplexer',
    text: [
      '       +-----+',
      ' A --->|     |',
      '       | MUX +----> Y',
      ' B --->|     |',
      '       +--+--+',
      '          |',
      '         SEL',
      '',
    ].join('\n'),
  },
  {
    label: 'adder',
    title: 'Full adder block',
    text: [
      '         +-------+',
      '  A ---->|       |',
      '  B ---->|  FA   +----> Sum',
      'Cin ---->|       +----> Cout',
      '         +-------+',
      '',
    ].join('\n'),
  },
  {
    label: 'SRAM',
    title: 'SRAM / memory block',
    text: [
      '        +----------+',
      'ADDR -->|          |',
      '        |   SRAM   |<--> DATA[31:0]',
      '  WE -->|          |',
      '  CE -->|  NxM     |',
      'CLK  -->|          |',
      '        +----------+',
      '',
    ].join('\n'),
  },
  {
    label: 'bus',
    title: 'Bus / bundle annotation',
    text: '=====[32]=====>',
  },
];

export function initToolbar(
  container: HTMLElement,
  getView: () => EditorView,
): void {
  for (const snippet of SNIPPETS) {
    const btn = document.createElement('button');
    btn.className = 'snippet-btn';
    btn.textContent = snippet.label;
    btn.title = snippet.title;
    btn.addEventListener('click', () => {
      focusTextTool();
      insertAtCursor(getView(), snippet.text);
    });
    container.appendChild(btn);
  }
}
