# Integration Guide: Terminal UI with SIP Dialer Core

This guide explains how to connect the terminal operator interface to the SIP dialer core being developed in parallel.

## Overview

The terminal interface is designed to work with the SIP dialer through a well-defined interface (`SIPClientInterface`). The SIP dialer core should implement this interface and emit events on the `SIPEventBus`.

## Required Integration Points

### 1. SIP Client Implementation

Create a real SIP client that implements `SIPClientInterface` from `types.ts`:

```typescript
import { EventEmitter } from 'events';
import { SIPClientInterface, SIPConfig, Call, SIPRegistration } from './types';
import { SIPEventBus } from './events/SIPEventBus';
import * as winston from 'winston';

export class RealSIPClient extends EventEmitter implements SIPClientInterface {
  private config: SIPConfig;
  private eventBus: SIPEventBus;
  private logger: winston.Logger;
  private registration: SIPRegistration | null = null;
  private calls: Map<string, Call> = new Map();
  private ua: any; //jadge SIP user agent

  constructor(config: SIPConfig, eventBus: SIPEventBus, logger: winston.Logger) {
    super();
    this.config = config;
    this.eventBus = eventBus;
    this.logger = logger;
  }

  async connect(): Promise<void> {
    // Connect to SIP server using node-sip or similar
    throw new Error('Not implemented');
  }

  async invite(phoneNumber: string, options?: any): Promise<Call> {
    // Initiate outbound call
    throw new Error('Not implemented');
  }

  // Implement all other interface methods...
}
```

### 2. Replace Mock Client in index.ts

In the CLI entry point (`src/index.ts`), replace the mock client:

```typescript
// Instead of:
const sipClient = new MockSIPClient(config, eventBus, logger);

// Use:
const sipClient = new RealSIPClient(config, eventBus, logger);
// or load dynamically:
const { RealSIPClient } = require('../api/sip/SIPClient');
const sipClient = new RealSIPClient(config, eventBus, logger);
```

### 3. Event Integration

The terminal UI listens to events emitted on `SIPEventBus`. The SIP dialer core should:

1. Create a single shared instance of `SIPEventBus`
2. Emit events when call state changes:
   ```typescript
   eventBus.emitCallEvent('call.outgoing', call);
   eventBus.emitCallEvent('call.connected', call);
   eventBus.emitCallEvent('call.ended', { call, reason });
   ```
3. Forward SIP messages to the event bus:
   ```typescript
   eventBus.emitSIPEvent('sip.message', { method, headers, body });
   ```

### 4. Architecture Flow

```
┌─────────────────┐
│   Terminal UI   │  ← reads call state
│   (TUI)         │  ← sends commands (dial, hangup)
└────────┬────────┘  ← receives events
         │
         ▼
┌─────────────────┐
│   CallManager   │  ← high-level orchestration
└────────┬────────┘  ← emits events
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  SIPClientIntf  │────▶│  SIP Dialer     │
│  (Interface)    │  call│  Core           │
└─────────────────┘     └─────────────────┘
```

### 5. Database Integration

The existing API uses SQLite to store call history. The terminal interface can query this database directly or through the call manager:

```typescript
// In CallManager, load history from database
import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./db/data.db');

private loadHistory(): Call[] {
  const history: Call[] = [];
  db.each('SELECT * FROM calls ORDER BY date DESC LIMIT 100', (err, row) => {
    history.push({
      id: row.callSid,
      number: row.itsto,
      direction: 'outbound',
      state: row.status,
      startTime: new Date(row.date),
      duration: row.duration || 0,
      muted: false,
      held: false,
      volume: 100
    });
  });
  return history;
}
```

### 6. Quick Integration Test

Create a test script `test-integration.ts`:

```typescript
import { SIPEventBus } from '../src/events/SIPEventBus';
import { CallManager } from '../src/call/CallManager';
import { MockSIPClient } from '../src/sip/SIPClient';

const eventBus = new SIPEventBus();
const sipClient = new MockSIPClient(
  { host: 'localhost', port: 5060, username: 'test', password: 'test', domain: 'localhost' },
  eventBus,
  console as any
);
const callManager = new CallManager(eventBus, sipClient, console as any);

// Test dial
callManager.dial('+1234567890').then(call => {
  console.log('Call started:', call.id);
  
  // After 3 seconds, hang up
  setTimeout(async () => {
    await callManager.hangup(call.id);
    console.log('Call ended');
    console.log('History:', callManager.getHistory());
  }, 3000);
});
```

### 7. Running the Terminal with Real SIP

Once the SIP dialer core is ready:

```bash
# Build terminal
cd terminal
npm run build

# Install SIP core if separate
npm install ../api

# Run with custom entry point
node -r ts-node/register src/index.ts --username myuser --password mypass
```

Or create a custom launcher:

```javascript
// launcher.js
const { TerminalUI } = require('./terminal');
const { RealSIPClient } = require('./api/sip/client');
const { SIPEventBus } = require('./terminal/events/SIPEventBus');
const { CallManager } = require('./terminal/call/CallManager');

const eventBus = new SIPEventBus();
const sipClient = new RealSIPClient(config, eventBus, logger);
const callManager = new CallManager(eventBus, sipClient, logger);

const tui = new TerminalUI(eventBus, callManager, logger);
tui.start();
```

## Expected Events from SIP Core

The SIP dialer core must emit these events via `SIPEventBus.emitCallEvent(type, data)`:

| Event Type | Data | Description |
|------------|------|-------------|
| `call.incoming` | `{ number, sipCallId }` | Incoming call |
| `call.outgoing` | `Call` | Outbound call initiated |
| `call.connected` | `Call` | Call answered |
| `call.ended` | `{ call, reason }` | Call terminated |
| `call.held` | `Call` | Call placed on hold |
| `call.resumed` | `Call` | Call resumed |
| `call.muted` | `Call` | Call muted |
| `call.unmuted` | `Call` | Call unmuted |
| `call.transferred` | `{ call, targetNumber, type }` | Call transferred |
| `call.digit` | `{ callId, digits }` | DTMF detected/sent |

## Connecting to Existing API

The existing API (`api/` directory) can be extended:

1. Add WebSocket or event emitter to broadcast SIP events
2. Create endpoint to send commands from terminal to dialer
3. Expose call history via REST endpoint

Example WebSocket bridge:

```javascript
// In api/app.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  // Forward SIP events to connected terminal UIs
  sipClient.on('*', (event) => {
    ws.send(JSON.stringify(event));
  });

  // Receive commands from terminal UI
  ws.on('message', (msg) => {
    const { command, data } = JSON.parse(msg);
    handleCommand(command, data);
  });
});
```

## Next Steps

1. Implement `RealSIPClient` using node-sip or pjsip
2. Wire the terminal to use real client instead of mock
3. Add configuration file for persistent settings
4. Implement volume control audio integration
5. Add SIP message inspector panel

## Troubleshooting

- **No events received**: Ensure `SIPEventBus` instance is shared between components
- **Calls not appearing**: Check that `CallManager` updates are being emitted
- **Type errors**: `SIPClientInterface` must be fully implemented
- **UI not responsive**: Verify `setInterval` updates and screen renders

---

For questions or issues, refer to the main README.md in the terminal directory.
