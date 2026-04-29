import blessed from 'blessed';

export class LogPanel {
  private box: blessed.Widgets.ListElement;
  private entries: any[] = [];

  constructor(options: {
    parent: blessed.Widgets.BoxElement;
    top?: number | string;
    left?: number | string;
    width?: number | string;
    height?: number | string;
    label?: string;
  }) {
    this.box = blessed.list({
      parent: options.parent,
      top: options.top as any,
      left: options.left as any,
      width: options.width as any,
      height: options.height as any,
      label: options.label || ' Logs ',
      border: { type: 'line', fg: 'cyan' } as any,
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      tags: true,
      style: { fg: 'green' }
    } as any);
  }

  getElement(): blessed.Widgets.ListElement {
    return this.box;
  }

  addEntry(entry: any): void {
    this.entries.push(entry);
    const time = entry.timestamp.toLocaleTimeString();
    let color = 'green';
    if (entry.level === 'error') color = 'red';
    else if (entry.level === 'warn') color = 'yellow';
    const message = `{${color}}[${time}] ${entry.message}{/${color}}`;
    (this.box as any).pushItem(message);
  }

  clear(): void {
    this.entries = [];
    this.box.setItems([]);
  }
}
