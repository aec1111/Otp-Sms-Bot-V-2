# SIP Dialer with TTS Integration

A Node.js/TypeScript application that provides SIP-based calling capabilities with Text-to-Speech integration, comprehensive error handling, logging, and a command-line interface.

## Features

- SIP protocol support for making and receiving calls
- Text-to-Speech integration using Google TTS API
- Comprehensive error handling for SIP timeouts, network failures, TTS API errors, and audio playback issues
- Winston-based logging with multiple verbosity levels
- Phone number and SIP credential validation
- Interactive CLI with keyboard shortcuts
- Graceful shutdown and resource cleanup

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd sip-dialer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (create a `.env` file):
   ```env
   SIP_USERNAME=your_sip_username
   SIP_PASSWORD=your_sip_password
   SIP_DOMAIN=your_sip_domain.com
   SIP_DISPLAY_NAME=Your Display Name
   TTS_LANG=en
   TTS_SLOW=false
   ```

## Usage

### Starting the Application

```bash
npm start
```

### CLI Commands

The application provides a command-line interface for controlling the SIP dialer:

#### Dial a Number

```bash
node src/cli/index.js dial <phone_number> [-t|--text "<tts_text>"]
```

Examples:
```bash
# Dial a number without TTS
node src/cli/index.js dial +1234567890

# Dial a number with TTS message
node src/cli/index.js dial +1234567890 -t "Hello, this is an automated message."
```

#### Hang Up Current Call

```bash
node src/cli/index.js hangup
```

#### Check Status

```bash
node src/cli/index.js status
```

#### Show Help

```bash
node src/cli/index.js --help
```

### Keyboard Shortcuts

During an active call:
- `Ctrl+C`: Hang up the call and exit the application

## Configuration

### SIP Configuration

Configure SIP connection settings via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `SIP_USERNAME` | SIP username for authentication | (required) |
| `SIP_PASSWORD` | SIP password for authentication | (required) |
| `SIP_DOMAIN` | SIP domain/server address | (required) |
| `SIP_DISPLAY_NAME` | Display name for SIP calls | Username |

### TTS Configuration

Configure Text-to-Speech settings:

| Variable | Description | Default |
|----------|-------------|---------|
| `TTS_LANG` | Language code for TTS (e.g., 'en', 'es', 'fr') | 'en' |
| `TTS_SLOW` | Whether to speak slowly | 'false' |

### Logging Configuration

Logging is handled automatically with Winston. Log files are stored in the `logs/` directory:
- `error.log`: Contains only error-level logs
- `all.log`: Contains all logs

Log levels (in order of severity):
- error
- warn
- info
- http
- debug

Set the log level via `NODE_ENV`:
- Production: `info` level (default)
- Development: `debug` level

## Error Handling

The application implements comprehensive error handling for various scenarios:

### SIP Errors
- `SipTimeoutError`: Thrown when SIP operations (registration, calls) timeout
- Network errors during SIP communication

### TTS Errors
- `TtsApiError`: Thrown when Google TTS API requests fail
- Validation errors for text input

### Audio Playback Errors
- `AudioPlaybackError`: Thrown when audio playback fails

### Validation Errors
- `ValidationError`: Thrown when phone numbers or SIP credentials are invalid

All errors are logged appropriately and can be caught by calling code.

## Project Structure

```
src/
├── cli/                  # Command-line interface
│   └── index.js          # CLI entry point
├── sip/                  # SIP protocol implementation
│   └── dialer.js         # SIP dialer class
├── tts/                  # Text-to-speech service
│   └── service.js        # TTS service class
├── utils/                # Utility functions
│   ├── logger.js         # Winston logger configuration
│   ├── errors.js         # Custom error classes
│   └── validation.js     # Input validation functions
└── index.js              # Main application entry point
```

## API Reference

### SipDialer Class

Handles SIP connection, registration, and call management.

#### Constructor
```javascript
new SipDialer(config)
```
Config object should contain:
- `username`: SIP username
- `password`: SIP password
- `domain`: SIP domain
- `displayName`: Optional display name

#### Methods
- `register()`: Register with SIP server
- `call(target)`: Make outbound call to target SIP URI
- `answer()`: Answer incoming call
- `hangup()`: End current call
- `hold()`: Hold current call
- `unhold()`: Unhold current call
- `unregister()`: Unregister from SIP server
- `disconnect()`: Clean up all resources
- `isRegisteredStatus()`: Get registration status
- `getSession()`: Get current session object

### TtsService Class

Handles Text-to-Speech conversion.

#### Constructor
```javascript
new TtsService(options)
```
Options object can contain:
- `lang`: Language code (default: 'en')
- `slow`: Speak slowly (default: false)
- `host`: Google TTS host (default: 'https://translate.google.com')
- `timeout`: Request timeout in ms (default: 10000)

#### Methods
- `textToSpeech(text)`: Convert text to speech and return audio URL
- `static getAvailableLanguages()`: Get list of supported languages
- `static isLanguageSupported(langCode)`: Check if language is supported

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

This project is licensed under the ISC License.

## Disclaimer

This software is for educational purposes only. Ensure you have proper authorization before making any calls. The developers are not responsible for any misuse of this software.