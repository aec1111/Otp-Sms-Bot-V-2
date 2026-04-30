import { EventEmitter } from 'events';
import { SIPEvent, SIPEventType, LogEntry } from '../types';

export class SIPEventBus extends EventEmitter {
  private logEntries: LogEntry[] = [];
  private maxLogEntries = 1000;

  // SIP Event emissions
  emitSIPEvent(type: SIPEventType, data?: any) {
    const event: SIPEvent = {
      type,
      data,
      timestamp: new Date()
    };
    super.emit(type, event);
    super.emit('*', event); // wildcard for any event
    this.addLog('sip', `Event: ${type}`, data);
  }

  // Call control events
  emitCallEvent(type: SIPEventType, data?: any) {
    this.emitSIPEvent(type, data);
  }

  // Logging functions
  addLog(source: LogEntry['source'], message: string, details?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'info',
      source,
      message,
      details
    };
    this.logEntries.push(entry);
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries = this.logEntries.slice(-this.maxLogEntries);
    }
    super.emit('log', entry);
  }

  addError(source: string, message: string, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'error',
      source: source as LogEntry['source'],
      message,
      details: error ? { error: error.message, stack: error.stack } : undefined
    };
    this.logEntries.push(entry);
    super.emit('log', entry);
  }

  addWarn(source: string, message: string, details?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'warn',
      source: source as LogEntry['source'],
      message,
      details
    };
    this.logEntries.push(entry);
    super.emit('log', entry);
  }

  getLogs(limit?: number): LogEntry[] {
    if (limit) {
      return this.logEntries.slice(-limit);
    }
    return [...this.logEntries];
  }

  clearLogs() {
    this.logEntries = [];
    super.emit('logsCleared');
  }

  // Get event history for debugging
  private eventHistory: SIPEvent[] = [];
  private maxEventHistory = 100;

  trackEvent(event: SIPEvent) {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxEventHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxEventHistory);
    }
  }

  getEventHistory(type?: SIPEventType): SIPEvent[] {
    if (type) {
      return this.eventHistory.filter(e => e.type === type);
    }
    return [...this.eventHistory];
  }
}

// Singleton instance
export const eventBus = new SIPEventBus();
