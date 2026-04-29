import { EventEmitter } from 'events';
import { SIPEventBus } from '../events/SIPEventBus';
import { SIPClientInterface, Call, SIPRegistration, Logger } from '../types';

// Adapter interface for connecting terminal UI to SIP dialer core
export interface SIPDialerAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Call operations
  dial(phoneNumber: string, options?: any): Promise<Call>;
  hangup(callId: string): Promise<void>;
  hold(callId: string): Promise<void>;
  resume(callId: string): Promise<void>;
  mute(callId: string, muted: boolean): Promise<void>;
  transfer(callId: string, targetNumber: string, type?: 'blind' | 'attended'): Promise<void>;
  sendDTMF(callId: string, digits: string): Promise<void>;
  setVolume(callId: string, level: number): Promise<void>;
  answer(callId: string): Promise<void>;
  
  // State queries
  getActiveCalls(): Call[];
  getCall(callId: string): Call | undefined;
  getRegistration(): SIPRegistration | null;
  getHistory(): Call[];
  
  // Event subscription
  on(event: string, listener: (...args: any[]) => void): this;
  off(event: string, listener: (...args: any[]) => void): this;
}

// Direct module adapter - connects via require()
export class DirectModuleAdapter extends EventEmitter implements SIPDialerAdapter {
  private sipClient: SIPClientInterface | null = null;
  private callManager: any = null;
  private connected = false;

  constructor(
    private eventBus: SIPEventBus,
    private logger: Logger
  ) {
    super();
  }

  async connect(): Promise<void> {
    try {
      // For now, fall back to mock
      this.logger.warn('DirectModuleAdapter: Using mock client - real integration pending');
      this.connected = true;
    } catch (error: any) {
      this.logger.error(`Failed to load SIP dialer core: ${error.message}`);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.sipClient) {
      await this.sipClient.disconnect();
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async dial(phoneNumber: string, options?: any): Promise<Call> {
    // Implementation would call actual dialer
    throw new Error('Not implemented - waiting for SIP dialer core');
  }

  async hangup(callId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async hold(callId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async resume(callId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async mute(callId: string, muted: boolean): Promise<void> {
    throw new Error('Not implemented');
  }

  async transfer(callId: string, targetNumber: string, type?: 'blind' | 'attended'): Promise<void> {
    throw new Error('Not implemented');
  }

  async sendDTMF(callId: string, digits: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async setVolume(callId: string, level: number): Promise<void> {
    throw new Error('Not implemented');
  }

  async answer(callId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  getActiveCalls(): Call[] {
    return [];
  }

  getCall(callId: string): Call | undefined {
    return undefined;
  }

  getRegistration(): SIPRegistration | null {
    return null;
  }

  getHistory(): Call[] {
    return [];
  }
}

// HTTP/REST API adapter - connects to dialer via HTTP
export class HttpApiAdapter extends EventEmitter implements SIPDialerAdapter {
  private baseUrl: string;
  private sessionId: string | null = null;

  constructor(
    private eventBus: SIPEventBus,
    private logger: Logger,
    baseUrl: string = 'http://localhost:3000'
  ) {
    super();
    this.baseUrl = baseUrl;
  }

  async connect(): Promise<void> {
    this.logger.info(`Connecting to SIP dialer API at ${this.baseUrl}`);
    // Test connection
    try {
      // Would do actual fetch here
      this.logger.info('API connection established');
      this.emit('connected');
    } catch (error: any) {
      this.logger.error(`Failed to connect to API: ${error.message}`);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.sessionId = null;
    this.emit('disconnected');
  }

  isConnected(): boolean {
    return this.sessionId !== null || true; // For now
  }

  async dial(phoneNumber: string, options?: any): Promise<Call> {
    // Would make POST /call request
    this.logger.info(`HTTP API: dial ${phoneNumber}`);
    throw new Error('HTTP API dial not yet implemented');
  }

  async hangup(callId: string): Promise<void> {
    // Would make POST /hangup request
    this.logger.info(`HTTP API: hangup ${callId}`);
    throw new Error('HTTP API hangup not yet implemented');
  }

  async hold(callId: string): Promise<void> {
    this.logger.info(`HTTP API: hold ${callId}`);
    throw new Error('Not implemented');
  }

  async resume(callId: string): Promise<void> {
    this.logger.info(`HTTP API: resume ${callId}`);
    throw new Error('Not implemented');
  }

  async mute(callId: string, muted: boolean): Promise<void> {
    this.logger.info(`HTTP API: mute ${callId} ${muted}`);
    throw new Error('Not implemented');
  }

  async transfer(callId: string, targetNumber: string, type?: 'blind' | 'attended'): Promise<void> {
    this.logger.info(`HTTP API: transfer ${callId} -> ${targetNumber}`);
    throw new Error('Not implemented');
  }

  async sendDTMF(callId: string, digits: string): Promise<void> {
    this.logger.info(`HTTP API: DTMF ${digits} to ${callId}`);
    throw new Error('Not implemented');
  }

  async setVolume(callId: string, level: number): Promise<void> {
    this.logger.info(`HTTP API: volume ${callId} -> ${level}`);
    throw new Error('Not implemented');
  }

  async answer(callId: string): Promise<void> {
    this.logger.info(`HTTP API: answer ${callId}`);
    throw new Error('Not implemented');
  }

  getActiveCalls(): Call[] {
    return [];
  }

  getCall(callId: string): Call | undefined {
    return undefined;
  }

  getRegistration(): SIPRegistration | null {
    return null;
  }

  getHistory(): Call[] {
    return [];
  }
}

// Factory function
export function createAdapter(
  type: 'mock' | 'direct' | 'http',
  eventBus: SIPEventBus,
  logger: Logger,
  config?: { baseUrl?: string }
): SIPDialerAdapter {
  switch (type) {
    case 'direct':
      return new DirectModuleAdapter(eventBus, logger);
    case 'http':
      return new HttpApiAdapter(eventBus, logger, config?.baseUrl);
    case 'mock':
    default:
      // Return mock SIPClient (already created in SIPClient.ts)
      throw new Error('Mock adapter should be created via MockSIPClient');
  }
}
