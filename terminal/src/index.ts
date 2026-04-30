// Terminal Operator Interface for SIP Dialer
// Entry point with CLI argument parsing

import { Command } from 'commander';
import { TerminalUI } from './tui/TerminalUI';
import { SIPEventBus } from './events/SIPEventBus';
import { CallManager } from './call/CallManager';
import { MockSIPClient } from './sip/SIPClient';
import * as winston from 'winston';
import { SIPConfig } from './types';

// Re-export all modules for library usage
export * from './types';
export * from './events/SIPEventBus';
export * from './sip/SIPClient';
export * from './call/CallManager';
export * from './tui/TerminalUI';

// CLI entry point
function main() {
  const program = new Command();

  program
    .name('dialer-terminal')
    .description('Interactive terminal operator interface for SIP dialer')
    .version('1.0.0')
    .option('-h, --host <host>', 'SIP server host', 'localhost')
    .option('-p, --port <port>', 'SIP server port', '5060')
    .option('-u, --username <username>', 'SIP username', '')
    .option('-P, --password <password>', 'SIP password', '')
    .option('-d, --domain <domain>', 'SIP domain', 'localhost')
    .option('-l, --loglevel <level>', 'Log level (debug, info, warn, error)', 'info')
    .option('--no-tui', 'Disable TUI, use CLI mode only', false)
    .parse(process.argv);

  const options = program.opts();

  // Configure winston logging
  const logger = winston.createLogger({
    level: options.loglevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] ${level}: ${message}`;
      })
    ),
    transports: [
      new winston.transports.Console({ stderrLevels: ['error', 'warn'] }),
      new winston.transports.File({ filename: 'terminal.log' })
    ]
  });

  logger.info('Starting Dialer Terminal Interface');

  // Initialize SIP event bus
  const eventBus = new SIPEventBus();

  // Initialize SIP client (mock for now)
  const config: SIPConfig = {
    host: options.host,
    port: parseInt(options.port),
    username: options.username,
    password: options.password,
    domain: options.domain
  };

  const sipClient = new MockSIPClient(config, eventBus, logger);
  sipClient.connect();
  logger.info('SIP client initialized');

  // Initialize call manager
  const callManager = new CallManager(eventBus, sipClient, logger);

  // Start TUI
  if (!options.noTui) {
    const tui = new TerminalUI(eventBus, callManager, logger, config);
    tui.start();
  } else {
    startCLIMode(eventBus, callManager, logger);
  }
}

function startCLIMode(eventBus: SIPEventBus, callManager: CallManager, logger: winston.Logger) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n=== Dialer CLI Mode ===');
  console.log('Commands: dial <number>, hangup <id>, hold <id>, resume <id>, mute <id>, unmute <id>, volume <id> <level>, transfer <id> <target>, history, status, exit\n');

  function prompt(): void {
    rl.question('> ', async (input: string) => {
      const [cmd, ...args] = input.trim().split(/\s+/);
      
      try {
        switch (cmd.toLowerCase()) {
          case 'dial':
            if (args[0]) {
              const call = await callManager.dial(args[0]);
              console.log(`Call initiated: ${call.id} -> ${args[0]}`);
            } else {
              console.log('Usage: dial <phone-number>');
            }
            break;
          case 'hangup':
            if (args[0]) {
              await callManager.hangup(args[0]);
              console.log(`Call ended: ${args[0]}`);
            } else {
              console.log('Usage: hangup <call-id>');
            }
            break;
          case 'hold':
            if (args[0]) {
              await callManager.hold(args[0]);
              console.log(`Call on hold: ${args[0]}`);
            } else {
              console.log('Usage: hold <call-id>');
            }
            break;
          case 'resume':
            if (args[0]) {
              await callManager.resume(args[0]);
              console.log(`Call resumed: ${args[0]}`);
            } else {
              console.log('Usage: resume <call-id>');
            }
            break;
          case 'mute':
            if (args[0]) {
              await callManager.mute(args[0], true);
              console.log(`Call muted: ${args[0]}`);
            } else {
              console.log('Usage: mute <call-id>');
            }
            break;
          case 'unmute':
            if (args[0]) {
              await callManager.mute(args[0], false);
              console.log(`Call unmuted: ${args[0]}`);
            } else {
              console.log('Usage: unmute <call-id>');
            }
            break;
          case 'volume':
            if (args[0] && args[1]) {
              await callManager.setVolume(args[0], parseInt(args[1]));
              console.log(`Volume set: ${args[0]} -> ${args[1]}%`);
            } else {
              console.log('Usage: volume <call-id> <level 0-100>');
            }
            break;
          case 'transfer':
            if (args[0] && args[1]) {
              await callManager.transfer(args[0], args[1]);
              console.log(`Call transferred: ${args[0]} -> ${args[1]}`);
            } else {
              console.log('Usage: transfer <call-id> <target-number>');
            }
            break;
          case 'history':
            const history = callManager.getHistory();
            console.log('\n=== Call History ===');
            history.forEach(c => {
              console.log(`${c.startTime.toLocaleTimeString()} | ${c.direction} | ${c.number} | ${c.state}`);
            });
            break;
          case 'status':
            const activeCalls = callManager.getActiveCalls();
            console.log('\n=== Active Calls ===');
            activeCalls.forEach(c => {
              console.log(`${c.id} | ${c.number} | ${c.state} | ${c.duration}s`);
            });
            break;
          case 'exit':
            process.exit(0);
            break;
          default:
            console.log('Unknown command');
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
      }
      
      prompt();
    });
  }

  prompt();
}

// Run if executed directly (not imported)
if (require.main === module) {
  main();
}
