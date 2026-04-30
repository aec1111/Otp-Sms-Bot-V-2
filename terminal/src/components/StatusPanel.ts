import blessed from 'blessed';
import { SIPRegistration, Call } from '../types';

export class StatusPanel {
  private box: blessed.Widgets.BoxElement;
  private registration: SIPRegistration | null = null;
  private activeCalls: Call[] = [];
  private stats = { totalCalls: 0, duration: 0 };

  constructor(options: {
    parent: blessed.Widgets.BoxElement;
    top?: number | string;
    left?: number | string;
    width?: number | string;
    height?: number | string;
    label?: string;
  }) {
    this.box = blessed.box({
      parent: options.parent,
      top: options.top as any,
      left: options.left as any,
      width: options.width as any,
      height: (options.height as any) || 10,
      label: options.label || ' Status ',
      border: { type: 'line', fg: 'cyan' },
      content: '',
      tags: true
    } as any);
  }

  getElement(): blessed.Widgets.BoxElement {
    return this.box;
  }

  updateRegistration(registration: SIPRegistration | null): void {
    this.registration = registration;
    this.render();
  }

  updateCalls(calls: Call[]): void {
    this.activeCalls = calls;
    this.render();
  }

  updateStats(totalCalls: number, duration: number): void {
    this.stats = { totalCalls, duration };
    this.render();
  }

  private render(): void {
    const now = new Date().toLocaleTimeString();
    
    let content = ` {bold}Status: {/bold}`;
    
    if (this.registration && this.registration.registered) {
      content += `{green}● Registered{/green} | Expires: ${this.registration.expires}s\n`;
      content += `   Registrar: ${this.registration.registrar} | Contact: ${this.registration.contact}\n`;
    } else {
      content += `{red}● Not Registered{/red}\n`;
    }

    content += ` {bold}Active Calls: {/bold}${this.activeCalls.length}`;
    if (this.activeCalls.length > 0) {
      this.activeCalls.forEach((call, idx) => {
        content += `\n   ${idx + 1}. ${call.number} (${call.state}) ${call.duration}s`;
        if (call.muted) content += ' [MUTED]';
        if (call.held) content += ' [HELD]';
      });
    }

    content += `\n {bold}Statistics:{/bold} Total: ${this.stats.totalCalls} calls | Uptime: ${Math.floor(this.stats.duration / 60)}min`;
    content += `\n {bold}Last Update:{/bold} ${now}`;
    
    this.box.setContent(content);
  }
}
