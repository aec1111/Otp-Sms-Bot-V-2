import { EventEmitter } from 'events';
import { SIPConfig, Call, SIPRegistration, Logger, SIPClientInterface } from '../types';
import { SIPEventBus } from '../events/SIPEventBus';
import * as winston from 'winston';

export class MockSIPClient extends EventEmitter implements SIPClientInterface {
  private config: SIPConfig;
  private logger: Logger;
  private _registered = false;
  private _registration: SIPRegistration | null = null;
  private calls: Map<string, Call> = new Map();
  private eventBus: SIPEventBus;

  constructor(config: SIPConfig, eventBus: SIPEventBus, logger: Logger) {
    super();
    this.config = config;
    this.eventBus = eventBus;
    this.logger = logger;
  }

  async connect(): Promise<void> {
    this.logger.info(`Connecting to SIP server ${this.config.host}:${this.config.port}`);
    await this.delay(500);
    this.logger.info('SIP connection established');
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    if (this._registered) {
      await this.unregister();
    }
    for (const call of this.calls.values()) {
      await this.hangup(call.id);
    }
    this.logger.info('SIP disconnected');
    this.emit('disconnected');
  }

  async register(): Promise<void> {
    this.logger.info(`Registering SIP user ${this.config.username}@${this.config.domain}`);
    await this.delay(200);
    this._registered = true;
    this._registration = {
      registered: true,
      expires: 3600,
      registrar: this.config.host,
      contact: `${this.config.username}@${this.config.host}`,
      timestamp: new Date()
    };
    this.logger.info('SIP registration successful');
    this.emit('registered', this._registration);
  }

  async unregister(): Promise<void> {
    this.logger.info('Unregistering SIP user');
    await this.delay(100);
    this._registered = false;
    this._registration = null;
    this.emit('unregistered');
  }

  isRegistered(): boolean {
    return this._registered;
  }

  getRegistration(): SIPRegistration | null {
    return this._registration;
  }

  async invite(phoneNumber: string, options?: any): Promise<Call> {
    this.logger.info(`Initiating call to ${phoneNumber}`);
    const callId = this.generateCallId();
    
    const call: Call = {
      id: callId,
      number: phoneNumber,
      direction: 'outbound',
      state: 'dialing',
      startTime: new Date(),
      duration: 0,
      muted: false,
      held: false,
      volume: 100,
      sipCallId: `sip-${callId}`
    };

    this.calls.set(callId, call);
    this.eventBus.emitCallEvent('call.outgoing', call);
    
    // Simulate call progression
    setTimeout(() => {
      call.state = 'ringing';
      this.emit('call.stateChange', call);
      this.eventBus.emitCallEvent('call.connected', call);
    }, 1000);

    this.emit('call.created', call);
    return call;
  }

  async answer(callId: string): Promise<void> {
    const call = this.calls.get(callId);
    if (call && call.direction === 'inbound') {
      call.state = 'active';
      this.eventBus.emitCallEvent('call.connected', call);
      this.emit('call.answered', call);
    }
  }

  async hangup(callId: string, reason?: string): Promise<void> {
    const call = this.calls.get(callId);
    if (call) {
      call.state = 'terminated';
      this.eventBus.emitCallEvent('call.ended', { call, reason });
      this.calls.delete(callId);
      this.emit('call.hungup', callId);
    }
  }

  async hold(callId: string): Promise<void> {
    const call = this.calls.get(callId);
    if (call && call.state === 'active') {
      call.held = true;
      call.state = 'held';
      this.eventBus.emitCallEvent('call.held', call);
      this.emit('call.held', call);
    }
  }

  async resume(callId: string): Promise<void> {
    const call = this.calls.get(callId);
    if (call && call.held) {
      call.held = false;
      call.state = 'active';
      this.eventBus.emitCallEvent('call.resumed', call);
      this.emit('call.resumed', call);
    }
  }

  async mute(callId: string, muted: boolean): Promise<void> {
    const call = this.calls.get(callId);
    if (call) {
      call.muted = muted;
      call.state = muted ? 'muted' : 'active';
      const event = muted ? 'call.muted' : 'call.unmuted';
      this.eventBus.emitCallEvent(event, call);
      this.emit(event, call);
    }
  }

  async transfer(callId: string, targetNumber: string, type: 'blind' | 'attended' = 'blind'): Promise<void> {
    const call = this.calls.get(callId);
    if (call) {
      this.logger.info(`Transferring call ${callId} to ${targetNumber} (${type})`);
      this.eventBus.emitCallEvent('call.transferred', { call, targetNumber, type });
      // Complete the transfer
      await this.hangup(callId, 'transferred');
    }
  }

  async sendDTMF(callId: string, digits: string): Promise<void> {
    const call = this.calls.get(callId);
    if (call) {
      this.logger.debug(`Sending DTMF ${digits} on call ${callId}`);
      this.eventBus.emitCallEvent('call.digit', { callId, digits });
    }
  }

  async setVolume(callId: string, level: number): Promise<void> {
    const call = this.calls.get(callId);
    if (call) {
      call.volume = Math.max(0, Math.min(100, level));
      this.logger.debug(`Volume set to ${call.volume}% on call ${callId}`);
    }
  }

  getActiveCalls(): Call[] {
    return Array.from(this.calls.values()).filter(c => 
      c.state === 'active' || c.state === 'held' || c.state === 'muted' || c.state === 'dialing' || c.state === 'ringing'
    );
  }

  getCall(callId: string): Call | undefined {
    return this.calls.get(callId);
  }

  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Factory to create appropriate SIP client
export function createSIPClient(
  config: SIPConfig,
  eventBus: SIPEventBus,
  logger: Logger,
  useMock: boolean = true
): SIPClientInterface {
  if (useMock) {
    return new MockSIPClient(config, eventBus, logger);
  }
  throw new Error('Real SIP client not yet implemented - use mock mode');
}
