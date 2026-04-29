import { EventEmitter } from 'events';
import { SIPEventBus } from '../events/SIPEventBus';
import { SIPClientInterface, Call, Logger } from '../types';
import * as winston from 'winston';

export class CallManager extends EventEmitter {
  private eventBus: SIPEventBus;
  private sipClient: SIPClientInterface;
  private logger: Logger;
  private callHistory: Call[] = [];
  private maxHistory = 100;

  constructor(eventBus: SIPEventBus, sipClient: SIPClientInterface, logger: Logger) {
    super();
    this.eventBus = eventBus;
    this.sipClient = sipClient;
    this.logger = logger;

    // Forward SIP events
    this.setupEventForwarding();
  }

  private setupEventForwarding() {
    const events = [
      'call.outgoing', 'call.incoming', 'call.connected',
      'call.ended', 'call.held', 'call.resumed',
      'call.muted', 'call.unmuted', 'call.transferred'
    ];

    events.forEach(eventType => {
      this.sipClient.on(eventType, (data: any) => {
        this.emit(eventType, data);
        if (eventType === 'call.ended') {
          this.addToHistory(data.call || data);
        }
      });
    });
  }

  async dial(phoneNumber: string, options?: any): Promise<Call> {
    this.logger.info(`Dialing ${phoneNumber}`);
    
    // Validate phone number
    if (!this.validatePhoneNumber(phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    const call = await this.sipClient.invite(phoneNumber, options);
    this.logger.info(`Call initiated: ${call.id}`);
    return call;
  }

  async hangup(callId: string): Promise<void> {
    this.logger.info(`Hanging up call ${callId}`);
    await this.sipClient.hangup(callId);
  }

  async hold(callId: string): Promise<void> {
    this.logger.info(`Placing call ${callId} on hold`);
    await this.sipClient.hold(callId);
  }

  async resume(callId: string): Promise<void> {
    this.logger.info(`Resuming call ${callId}`);
    await this.sipClient.resume(callId);
  }

  async mute(callId: string, muted: boolean): Promise<void> {
    this.logger.info(`${muted ? 'Muting' : 'Unmuting'} call ${callId}`);
    await this.sipClient.mute(callId, muted);
  }

  async setVolume(callId: string, level: number): Promise<void> {
    if (level < 0 || level > 100) {
      throw new Error('Volume must be between 0 and 100');
    }
    await this.sipClient.setVolume(callId, level);
    this.logger.debug(`Volume set to ${level}% on call ${callId}`);
  }

  async transfer(callId: string, targetNumber: string, type: 'blind' | 'attended' = 'blind'): Promise<void> {
    if (!this.validatePhoneNumber(targetNumber)) {
      throw new Error('Invalid transfer target number');
    }
    this.logger.info(`Transferring call ${callId} to ${targetNumber}`);
    await this.sipClient.transfer(callId, targetNumber, type);
  }

  async sendDTMF(callId: string, digits: string): Promise<void> {
    // Validate DTMF digits
    if (!/^[0-9*#]+$/.test(digits)) {
      throw new Error('Invalid DTMF digits');
    }
    await this.sipClient.sendDTMF(callId, digits);
    this.logger.debug(`Sent DTMF: ${digits}`);
  }

  async answer(callId: string): Promise<void> {
    await this.sipClient.answer(callId);
  }

  getActiveCalls(): Call[] {
    return this.sipClient.getActiveCalls();
  }

  getCall(callId: string): Call | undefined {
    return this.sipClient.getCall(callId);
  }

  getHistory(): Call[] {
    return [...this.callHistory];
  }

  getStats(): { totalCalls: number; activeCalls: number; duration: number } {
    return {
      totalCalls: this.callHistory.length,
      activeCalls: this.getActiveCalls().length,
      duration: this.callHistory.reduce((sum, c) => sum + c.duration, 0)
    };
  }

  private addToHistory(call: Call) {
    this.callHistory.push({ ...call, endTime: new Date() });
    if (this.callHistory.length > this.maxHistory) {
      this.callHistory = this.callHistory.slice(-this.maxHistory);
    }
    this.emit('historyUpdated', this.callHistory);
  }

  private validatePhoneNumber(number: string): boolean {
    // Basic phone number validation: 8-15 digits, optional + prefix
    return /^\+?[0-9]{8,15}$/.test(number.replace(/\s/g, ''));
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down CallManager');
    const activeCalls = this.getActiveCalls();
    for (const call of activeCalls) {
      try {
        await this.hangup(call.id);
      } catch (error) {
        this.logger.error(`Error hanging up call ${call.id}: ${error}`);
      }
    }
  }
}
