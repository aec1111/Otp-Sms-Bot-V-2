import blessed from 'blessed';

export class CommandPalette {
  private container: blessed.Widgets.BoxElement;
  private input: blessed.Widgets.TextboxElement;
  private results: blessed.Widgets.ListElement;
  private visible = false;
  private commands: any[] = [];
  private onSelectCb: (cmd: any) => void;
  private selectedIndex = 0;

  constructor(options: {
    parent: blessed.Widgets.BoxElement;
    onSelect?: (command: any) => void;
  }) {
    this.onSelectCb = options.onSelect || (() => {});

    this.container = blessed.box({
      parent: options.parent,
      top: '30%' as any,
      left: '25%' as any,
      width: '50%' as any,
      height: '40%' as any,
      border: { type: 'line', fg: 'cyan' },
      bg: 'black',
      fg: 'white',
      visible: false,
      draggable: true,
      keys: true,
      mouse: true
    } as any);

    this.input = blessed.textbox({
      parent: this.container,
      top: 0 as any,
      left: 0 as any,
      width: '100%' as any,
      height: 1 as any,
      border: { type: 'line', fg: 'cyan' },
      content: '> ',
      style: { fg: 'cyan', border: { fg: 'cyan' } },
      keys: true
    } as any);

    this.results = blessed.list({
      parent: this.container,
      top: 1 as any,
      left: 0 as any,
      width: '100%' as any,
      height: '100%' as any,
      items: [],
      mouse: true,
      keys: true,
      vi: true,
      tags: true,
      style: { fg: 'white', selected: { bg: 'blue' } }
    } as any);

    this.setupEvents();
  }

  private setupEvents(): void {
    this.input.on('submit', (value: string) => {
      const selected = this.commands[this.selectedIndex];
      if (selected) {
        this.onSelectCb(selected);
      }
      this.hide();
    });

    this.input.on('key', (ch: string, key: any) => {
      if (key.name === 'escape') this.hide();
      else if (key.name === 'down') {
        this.selectedIndex = Math.min(this.commands.length - 1, this.selectedIndex + 1);
        this.updateSelection();
      } else if (key.name === 'up') {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.updateSelection();
      }
    });
  }

  private updateSelection(): void {
    // Use Y property to set selection
    (this.results as any).Y = this.selectedIndex;
    this.container.screen.render();
  }

  setCommands(commands: any[]): void {
    this.commands = commands;
    const items = commands.map((c: any) => `{cyan}${c.key}{/cyan} - ${c.description}`);
    this.results.setItems(items);
    this.selectedIndex = 0;
  }

  show(): void {
    this.visible = true;
    this.container.visible = true;
    this.input.setValue('');
    this.input.focus();
    this.selectedIndex = 0;
    this.updateSelection();
    this.container.screen.render();
  }

  hide(): void {
    this.visible = false;
    this.container.visible = false;
    this.container.screen.render();
  }

  isVisible(): boolean {
    return this.visible;
  }

  toggle(): void {
    if (this.visible) this.hide(); else this.show();
  }
}
