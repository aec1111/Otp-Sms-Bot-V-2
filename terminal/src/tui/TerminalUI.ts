import blessed from 'blessed';
import * as contrib from 'blessed-contrib';
import { SIPEventBus } from '../events/SIPEventBus';
import { CallManager } from '../call/CallManager';
import { Call, Logger, SIPConfig } from '../types';
import * as winston from 'winston';

export class TerminalUI {
  private screen: blessed.Widgets.Screen;
  private eventBus: SIPEventBus;
  private callManager: CallManager;
  private logger: Logger;
  private config: SIPConfig;

  // UI Elements
  private statusBar!: blessed.Widgets.BoxElement;
  private activeCallsGrid: any;
  private callHistoryTable: any;
  private logBox!: blessed.Widgets.ListElement;
  private helpBox!: blessed.Widgets.BoxElement;

  private selectedCallIndex = 0;
  private activeCalls: Call[] = [];

  constructor(
    eventBus: SIPEventBus,
    callManager: CallManager,
    logger: Logger,
    config: SIPConfig = { host: 'localhost', port: 5060, username: '', password: '', domain: 'localhost' }
  ) {
    this.eventBus = eventBus;
    this.callManager = callManager;
    this.logger = logger;
    this.config = config;

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'SIP Dialer Operator Interface',
      cursor: { artificial: true, shape: 'line', blink: true, color: 'white' }
    } as any);

    this.setupLayout();
    this.setupKeybindings();
    this.setupEventListeners();

    this.screen.key(['C-c', 'q'], () => this.shutdown());
  }

  private setupLayout(): void {
    const mainBox = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      border: 'line',
      style: { border: { fg: 'cyan' } }
    } as any);

    this.statusBar = blessed.box({
      parent: mainBox,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      border: undefined,
      bg: 'blue',
      fg: 'white',
      tags: true
    } as any);

    this.activeCallsGrid = contrib.table({
      parent: mainBox,
      top: 4,
      left: 0,
      width: '45%',
      height: '40%',
      label: ' Active Calls ',
      border: { type: 'line', fg: 'cyan' },
      columnSpacing: 2,
      columnWidth: [12, 12, 10, 8],
      data: {
        headers: ['ID', 'Number', 'State', 'Duration'],
        data: []
      }
    } as any);

    this.callHistoryTable = contrib.table({
      parent: mainBox,
      top: 4,
      right: 0,
      width: '50%',
      height: '40%',
      label: ' Call History ',
      border: { type: 'line', fg: 'cyan' },
      columnSpacing: 2,
      columnWidth: [18, 15, 12, 10],
      data: {
        headers: ['Time', 'Number', 'Dir', 'Status'],
        data: []
      }
    } as any);

    this.logBox = blessed.list({
      parent: mainBox,
      bottom: 8,
      left: 0,
      width: '100%',
      height: '45%',
      label: ' SIP Event Log ',
      border: { type: 'line', fg: 'cyan' },
      items: [],
      scrollable: true,
      alwaysScroll: true,
      tags: true,
      style: { fg: 'green' }
    } as any);

    this.helpBox = blessed.box({
      parent: mainBox,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 7,
      border: { type: 'line', fg: 'yellow' },
      content: this.getHelpText(),
      tags: true,
      scrollable: true
    } as any);

    this.screen.render();
  }

  private getHelpText(): string {
    return ' {bold}Keyboard Shortcuts:{/bold}\n  {cyan}N{/cyan} - New Dial    {cyan}H{/cyan} - Hangup   {cyan}O{/cyan} - Hold/Resume  {cyan}M{/cyan} - Mute/Unmute\n  {cyan}T{/cyan} - Transfer    {cyan}R{/cyan} - Answer   {cyan}V{/cyan} - Volume       {cyan}U{/cyan} - Send DTMF\n  {cyan}Arrow Keys{/cyan} - Navigate {cyan}Enter{/cyan} - Select  {cyan}L{/cyan} - Clear Logs  {cyan}?{/cyan} - Toggle Help';
  }

  private setupKeybindings(): void {
    this.screen.key('n', () => this.showDialDialog());
    
    this.screen.key('h', () => {
      const call = this.activeCalls[this.selectedCallIndex];
      if (call) this.performHangup(call.id);
    });

    this.screen.key('o', async () => {
      const call = this.activeCalls[this.selectedCallIndex];
      if (call) {
        if (call.state === 'active') await this.callManager.hold(call.id);
        else if (call.state === 'held') await this.callManager.resume(call.id);
      }
    });

    this.screen.key('m', async () => {
      const call = this.activeCalls[this.selectedCallIndex];
      if (call && (call.state === 'active' || call.state === 'muted')) {
        await this.callManager.mute(call.id, !call.muted);
      }
    });

    this.screen.key('t', () => {
      const call = this.activeCalls[this.selectedCallIndex];
      if (call) this.showTransferDialog(call);
    });

    this.screen.key('r', async () => {
      const call = this.activeCalls.find(c => c.direction === 'inbound' && c.state === 'ringing');
      if (call) await this.callManager.answer(call.id);
    });

    this.screen.key('u', () => {
      const call = this.activeCalls[this.selectedCallIndex];
      if (call) this.showDTMFDialog(call);
    });

    this.screen.key('up', () => {
      this.selectedCallIndex = Math.max(0, this.selectedCallIndex - 1);
      this.screen.render();
    });
    this.screen.key('down', () => {
      this.selectedCallIndex = Math.min(this.activeCalls.length - 1, this.selectedCallIndex + 1);
      this.screen.render();
    });

    this.screen.key('?', () => {
      this.helpBox.visible = !this.helpBox.visible;
      this.screen.render();
    });

    this.screen.key('l', () => {
      this.eventBus.clearLogs();
      this.logBox.setItems([]);
      this.screen.render();
    });

    this.screen.key('F5', () => {
      this.updateActiveCalls();
      this.screen.render();
    });
  }

  private setupEventListeners(): void {
    this.eventBus.on('log', (entry: any) => {
      const timestamp = entry.timestamp.toLocaleTimeString();
      const color = entry.level === 'error' ? 'red' : entry.level === 'warn' ? 'yellow' : 'green';
      (this.logBox as any).pushItem(`{${color}}[${timestamp}] ${entry.message}{/${color}}`);
    });

    ['call.outgoing', 'call.connected', 'call.ended', 'call.held', 'call.resumed', 'call.muted', 'call.unmuted'].forEach(event => {
      this.eventBus.on(event, () => this.updateActiveCalls());
    });
  }

  start(): void {
    this.logger.info('Starting Terminal UI');
    setInterval(() => this.updateActiveCalls(), 1000);
    this.screen.render();
  }

  private updateActiveCalls(): void {
    this.activeCalls = this.callManager.getActiveCalls();
    
    const data = this.activeCalls.map((call: Call) => [
      call.id.substring(0, 10),
      call.number,
      this.getStateDisplay(call),
      this.formatDuration(call.duration)
    ]);

    const displayData = data.length > 0 ? data : [['', 'No active calls', '', '']];
    
    this.activeCallsGrid.setData({
      headers: ['ID', 'Number', 'State', 'Duration'],
      data: displayData
    } as any);

    // Update durations for active calls
    this.activeCalls.forEach((call: Call) => {
      if (['active', 'held', 'muted'].includes(call.state)) {
        call.duration++;
      }
    });

    this.updateStatusBar();
    this.screen.render();
  }

  private getStateDisplay(call: Call): string {
    const stateMap: Record<string, { text: string; color: string }> = {
      'dialing': { text: 'Dialing', color: 'yellow' },
      'ringing': { text: 'Ringing', color: 'yellow' },
      'active': { text: 'Active', color: 'green' },
      'held': { text: 'On Hold', color: 'cyan' },
      'muted': { text: 'Muted', color: 'magenta' },
      'terminated': { text: 'Ended', color: 'grey' },
      'failed': { text: 'Failed', color: 'red' }
    };
    const d = stateMap[call.state] || { text: call.state, color: 'white' };
    return `{${d.color}}${d.text}{/${d.color}}`;
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private updateStatusBar(): void {
    const time = new Date().toLocaleTimeString();
    const activeCount = this.activeCalls.length;
    const isRegistered = true; // TODO: get from SIP client
    const regColor = isRegistered ? 'green' : 'red';
    const content = ` {bold}SIP Dialer{/bold} | {cyan}${this.config.username}@{this.config.host}{/cyan} | SIP: {${regColor}}${isRegistered ? 'Registered' : 'Not Registered'}{/${regColor}} | Active: ${activeCount} | ${time} `;
    this.statusBar.setContent(content);
  }

  private showDialDialog(): void {
    const dialInput = blessed.textbox({
      parent: this.screen,
      top: '50%',
      left: '30%',
      width: '40%',
      height: 3,
      border: 'line',
      label: ' Dial Number ',
      keys: true,
      mouse: true
    } as any);

    dialInput.focus();
    this.screen.render();

    dialInput.on('submit', async (value: string) => {
      dialInput.destroy();
      const number = value.trim();
      if (number) {
        try {
          await this.callManager.dial(number);
          this.logger.info(`Dialing ${number}`);
        } catch (error: any) {
          this.logger.error(`Dial failed: ${error.message}`);
        }
      }
    });

    dialInput.on('cancel', () => { dialInput.destroy(); this.screen.render(); });
  }

  private showTransferDialog(call: Call): void {
    const transferInput = blessed.textbox({
      parent: this.screen,
      top: '50%',
      left: '30%',
      width: '40%',
      height: 3,
      border: 'line',
      label: ` Transfer to: `,
      keys: true,
      mouse: true
    } as any);

    transferInput.focus();
    this.screen.render();

    transferInput.on('submit', async (value: string) => {
      transferInput.destroy();
      const target = value.trim();
      if (target) {
        try {
          await this.callManager.transfer(call.id, target);
          this.logger.info(`Transfer to ${target}`);
        } catch (error: any) {
          this.logger.error(`Transfer failed: ${error.message}`);
        }
      }
    });

    transferInput.on('cancel', () => { transferInput.destroy(); this.screen.render(); });
  }

  private showDTMFDialog(call: Call): void {
    const dtmfInput = blessed.textbox({
      parent: this.screen,
      top: '50%',
      left: '40%',
      width: '20%',
      height: 3,
      border: 'line',
      label: ' DTMF: ',
      keys: true,
      mouse: true
    } as any);

    dtmfInput.focus();
    this.screen.render();

    dtmfInput.on('submit', async (value: string) => {
      dtmfInput.destroy();
      const digits = value.trim();
      if (digits) {
        try {
          await this.callManager.sendDTMF(call.id, digits);
          this.logger.info(`Sent DTMF: ${digits}`);
        } catch (error: any) {
          this.logger.error(`DTMF failed: ${error.message}`);
        }
      }
    });

    dtmfInput.on('cancel', () => { dtmfInput.destroy(); this.screen.render(); });
  }

  private async performHangup(callId: string): Promise<void> {
    try {
      await this.callManager.hangup(callId);
    } catch (error: any) {
      this.logger.error(`Hangup failed: ${error.message}`);
    }
  }

  private playSound(type: string): void {
    // Placeholder for audio feedback
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Terminal UI');
    await this.callManager.shutdown();
    process.exit(0);
  }
}
