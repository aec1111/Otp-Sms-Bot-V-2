import blessed from 'blessed';

export class StatusBar {
  private bar: blessed.Widgets.BoxElement;

  constructor(options: {
    parent: blessed.Widgets.BoxElement;
    top?: number;
    left?: number;
    width?: number | string;
    height?: number;
  }) {
    this.bar = blessed.box({
      parent: options.parent,
      top: options.top || 0,
      left: options.left || 0,
      width: options.width || '100%',
      height: options.height || 3,
      border: undefined,
      bg: 'blue',
      fg: 'white',
      content: '',
      tags: true
    } as blessed.Widgets.BoxOptions);
  }

  update(status: {
    sipStatus: string;
    username: string;
    host: string;
    activeCalls: number;
    time: string;
  }): void {
    const sipColor = status.sipStatus === 'Registered' ? 'green' : 'red';
    const content = ` {bold}SIP Dialer{/bold} | {cyan}${status.username}@{status.host}{/cyan} | SIP: {${sipColor}}${status.sipStatus}{/${sipColor}} | Active: ${status.activeCalls} | ${status.time} `;
    this.bar.setContent(content);
  }

  setMessage(message: string, color: string = 'white'): void {
    this.bar.setContent(`{${color}}${message}{/${color}}`);
  }
}
