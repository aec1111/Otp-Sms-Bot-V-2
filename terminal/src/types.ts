// Type definitions for the SIP Dialer Terminal Interface

import * as winston from 'winston';
import { EventEmitter } from 'events';

export type Logger = winston.Logger;

export interface SIPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  domain: string;
}

export interface SIPClientInterface extends EventEmitter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  register(): Promise<void>;
  unregister(): Promise<void>;
  isRegistered(): boolean;
  getRegistration(): SIPRegistration | null;
  invite(phoneNumber: string, options?: any): Promise<Call>;
  answer(callId: string): Promise<void>;
  hangup(callId: string, reason?: string): Promise<void>;
  hold(callId: string): Promise<void>;
  resume(callId: string): Promise<void>;
  mute(callId: string, muted: boolean): Promise<void>;
  transfer(callId: string, targetNumber: string, type?: 'blind' | 'attended'): Promise<void>;
  sendDTMF(callId: string, digits: string): Promise<void>;
  setVolume(callId: string, level: number): Promise<void>;
  getActiveCalls(): Call[];
  getCall(callId: string): Call | undefined;
}

export interface CallState {
  idle: string;
  dialing: string;
  ringing: string;
  active: string;
  held: string;
  muted: string;
  ending: string;
  terminated: string;
  failed: string;
}

export interface Call {
  id: string;
  number: string;
  direction: 'inbound' | 'outbound';
  state: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  muted: boolean;
  held: boolean;
  volume: number;
  remoteNumber?: string;
  sipCallId?: string;
}

export interface SIPMessage {
  type: 'request' | 'response' | 'info';
  method?: string;
  statusCode?: number;
  statusText?: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: Date;
}

export interface SIPRegistration {
  registered: boolean;
  expires: number;
  registrar: string;
  contact: string;
  timestamp: Date;
}

export interface TransferRequest {
  callId: string;
  targetNumber: string;
  type: 'blind' | 'attended';
}

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: 'sip' | 'call' | 'tui' | 'system';
  message: string;
  details?: Record<string, any>;
}

export interface KeyBinding {
  key: string;
  modifier?: 'ctrl' | 'alt' | 'shift';
  description: string;
  action: string;
}

export interface TUITheme {
  border: string;
  title: string;
  text: string;
  highlight: string;
  error: string;
  success: string;
  warning: string;
}

// Event types for inter-component communication
export type SIPEventType = 
  | 'sip.registered' 
  | 'sip.unregistered' 
  | 'sip.message' 
  | 'sip.error'
  | 'call.incoming'
  | 'call.outgoing'
  | 'call.connected'
  | 'call.ended'
  | 'call.held'
  | 'call.resumed'
  | 'call.muted'
  | 'call.unmuted'
  | 'call.transferred'
  | 'call.digit'
  | 'tts.start'
  | 'tts.end'
  | 'volume.changed';

export interface SIPEvent {
  type: SIPEventType;
  data?: any;
  timestamp: Date;
}
