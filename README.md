# SIP Dialer Core

Telegram : CoreLine76

This is a SIP (Session Initiation Protocol) dialer implementation for Node.js/TypeScript. It handles connection/authentication, registration, outbound/inbound calls, hold/resume, and termination using the `sip` package.

## Features

- SIP client module with connection/authentication
- Registration with SIP registrar
- Outbound and inbound call handling
- Call hold/resume functionality
- Call termination
- Error handling for network issues and auth failures
- Logging with Winston
- TypeScript support

## Installation

```bash
npm install
```

## Usage

```javascript
const { SIPClient } = require('./dist/sipClient');

// Configuration
const config = {
  uri: 'sip:username@domain.com', // e.g., 'sip:1234@sip.provider.com'
  password: 'your-password',
  registerExpires: 300 // 5 minutes (optional)
};

// Create SIP client instance
const sipClient = new SIPClient(config);

// Connect and register
await sipClient.connect();

// Make a call
const target = 'sip:5678@domain.com';
const session = await sipClient.call(target);

// Handle calls
// sipClient.hold();
// sipClient.unhold();
// sipClient.hangup();

// Disconnect when done
await sipClient.disconnect();
```

## API

### SIPClient(config, options)

Creates a new SIP client instance.

#### Parameters
- `config`: Object with SIP connection details
  - `uri`: SIP URI (e.g., 'sip:username@domain.com')
  - `password`: Password for authentication
  - `registerExpires`: Registration expiration in seconds (default: 300)
- `options`: Optional configuration
  - `socket`: Custom transport socket

### Methods

#### connect()
Connects to the SIP server and initiates registration.
Returns a Promise that resolves when registered.

#### disconnect()
Disconnects from the SIP server and stops the UA.
Returns a Promise that resolves when disconnected.

#### register()
Manually triggers registration (usually called automatically on connect).
Returns a Promise that resolves when registered.

#### unregister()
Unregisters from the SIP server.
Returns a Promise that resolves when unregistered.

#### call(target)
Places an outbound call to the target SIP URI.
Returns a Promise that resolves with the session when the call is accepted.

#### answer()
Answers an incoming call (if available).

#### hangup()
Ends the current call.

#### hold()
Puts the current call on hold.

#### unhold()
Takes the current call off hold.

#### isRegisteredStatus()
Returns true if currently registered, false otherwise.

#### getSession()
Returns the current call session object.

## Events

The SIP client emits various events that can be listened to:
- `registered`: When registration is successful
- `unregistered`: When unregistered from the server
- `registrationFailed`: When registration fails
- `invite`: When an incoming call invitation is received
- `message`: When a SIP message is received
- `connect`: When the SIP transport connects
- `disconnect`: When the SIP transport disconnects

## Example

See `example.ts` for a basic usage example.

## Dependencies

- `sip`: SIP protocol implementation
- `winston`: Logging library
- `google-tts-api`: Text-to-speech API (for future integration)
- `commander`: Command-line interface parser
- `typescript`: TypeScript compiler

## Development

```bash
# Compile TypeScript
npx tsc

# Run example
node example.ts
```

## License

ISC