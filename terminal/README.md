# Terminal Operator Interface

Interactive terminal UI for real-time control of the SIP dialer system.

## Features

- **Real-time Call Control**: Dial numbers, answer, hang up, hold, resume, mute, transfer
- **Volume Control**: Adjust call volume with visual slider
- **DTMF Sending**: Send touch tones during calls
- **Active Calls View**: See all active calls with status and duration
- **Call History**: Full history of completed calls with timestamps
- **SIP Registration Status**: Real-time SIP registration information
- **Event Logging**: Live SIP event log with color-coded messages
- **Keyboard Shortcuts**: Full keyboard control for fast operation

## Installation

```bash
cd terminal
npm install
npm run build
```

## Usage

### Starting the Terminal UI

```bash
# With full TUI
npm start

# With CLI mode only (no interactive UI)
npm start -- --no-tui

# Custom SIP credentials
npm start -- --username myuser --password mypass --domain sip.example.com

# Different log level
npm start -- --loglevel debug
```

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `-h, --host <host>` | SIP server hostname | localhost |
| `-p, --port <port>` | SIP server port | 5060 |
| `-u, --username <user>` | SIP authentication username | - |
| `-P, --password <pass>` | SIP authentication password | - |
| `-d, --domain <domain>` | SIP domain | same as host |
| `-l, --loglevel <level>` | Log level (debug, info, warn, error) | info |
| `--no-tui` | Disable TUI, use CLI mode | false |
| `-v, --version` | Show version | - |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | New dial dialog |
| `H` | Hang up selected call |
| `O` | Hold/Resume selected call |
| `M` | Mute/Unmute selected call |
| `V` | Volume control for selected call |
| `T` | Transfer selected call |
| `R` | Answer incoming call |
| `U` | Send DTMF tones |
| `↑/↓` | Navigate calls |
| `Enter` | Select/View call details |
| `L` | Clear event log |
| `F5` | Refresh UI |
| `?` | Toggle help |
| `ESC` | Close dialogs/cancel |
| `Ctrl+C` or `Q` | Quit |

## Interface Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ SIP Dialer Operator Interface | user@host | SIP: Registered    │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────┐  ┌──────────────────────────────────┐ │
│ │  Active Calls         │  │  Call History                    │ │
│ │  ID    Number State   │  │  Time    Number Dir Status       │ │
│ │ ───────────────────── │  │ ──────────────────────────────── │ │
│ │                       │  │                                  │ │
│ └───────────────────────┘  └──────────────────────────────────┘ │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────────┐ │
│ │ SIP Event Log                                                 │ │
│ │ [12:34:56] Event: call.connected                             │ │
│ └───────────────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────────────────────────┐ │
│ │ Keyboard: N-Dial H-Hangup O-Hold M-Mute V-Volume T-Transfer │ │
│ └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## CLI Mode

When started with `--no-tui`, the application runs in command-line mode:

```
> dial +33612345678
Call initiated: call_1681234567890_abc123 -> +33612345678

> hangup call_1681234567890_abc123
Call ended: call_1681234567890_abc123

> hold call_1681234567890_abc123
Call on hold: call_1681234567890_abc123

> volume call_1681234567890_abc123 75
Volume set: call_1681234567890_abc123 -> 75%

> history
=== Call History ===
12:34:56 | Out | +33612345678 | active
...

> status
=== Active Calls ===
call_abc123 | +33612345678 | active | 45s
SIP: Registered
```

## Integration with SIP Dialer Core

The terminal interface is designed to work with the SIP dialer core. It can connect in multiple ways:

1. **Same Process** - Import SIP client directly
2. **HTTP API** - Connect to dialer's REST API
3. **WebSocket** - Real-time event streaming (planned)

Configuration for integration:

```typescript
import { createAdapter } from './adapters/SIPDialerAdapter';

// HTTP API adapter
const adapter = createAdapter('http', eventBus, logger, {
  baseUrl: 'http://localhost:3000'
});

// Direct module adapter
const adapter = createAdapter('direct', eventBus, logger);
```

## SIP Events

The terminal UI subscribes to the following SIP events:

| Event | Description |
|-------|-------------|
| `sip.registered` | SIP registration successful |
| `sip.unregistered` | SIP unregistered |
| `sip.message` | Raw SIP message received |
| `sip.error` | SIP protocol error |
| `call.incoming` | Incoming call |
| `call.outgoing` | Outgoing call initiated |
| `call.connected` | Call connected (answered) |
| `call.ended` | Call terminated |
| `call.held` | Call placed on hold |
| `call.resumed` | Call resumed from hold |
| `call.muted` | Call muted |
| `call.unmuted` | Call unmuted |
| `call.transferred` | Call transferred |
| `call.digit` | DTMF digit detected/sent |

## Logging

The terminal UI uses winston for logging with multiple transports:

- **Console**: Colorized output to terminal
- **File**: All logs written to `terminal.log`

Log levels: `debug`, `info`, `warn`, `error`

Change log level with `--loglevel debug`.

## Architecture

```
terminal/
├── src/
│   ├── index.ts              # Entry point, CLI parsing
│   ├── types.ts              # TypeScript interfaces
│   ├── events/
│   │   └── SIPEventBus.ts    # Central event bus
│   ├── sip/
│   │   └── SIPClient.ts      # SIP client interface (mock + real)
│   ├── call/
│   │   └── CallManager.ts    # High-level call control
│   ├── tui/
│   │   └── TerminalUI.ts     # Main TUI implementation
│   ├── components/
│   │   ├── LogPanel.ts       # Event log display
│   │   ├── StatusPanel.ts    # Status information
│   │   ├── StatusBar.ts      # Header status bar
│   │   └── CommandPalette.ts # Quick command palette
│   └── adapters/
│       └── SIPDialerAdapter.ts  # Integration adapters
├── package.json
├── tsconfig.json
└── README.md
```

## Development

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Run built version
npm start
```

## Error Handling

The terminal UI displays errors in:
1. The event log (red text)
2. Toast notifications for critical errors
3. Error dialogs for input validation failures

All errors are also logged to `terminal.log`.

## Future Enhancements

- Real-time audio visualizer
- Call recording controls
- Conference call management
- SIP message inspector
- Configuration file support
- Customizable themes
- Multi-line TUI layout customization
