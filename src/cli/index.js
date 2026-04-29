const { program } = require('commander');
const SipDialer = require('../sip/dialer');
const TtsService = require('../tts/service');
const logger = require('../utils/logger');
const { isValidPhoneNumber } = require('../utils/validation');

// Configuration (in a real app, this would come from config file or environment variables)
const config = {
  sip: {
    username: process.env.SIP_USERNAME || 'your_username',
    password: process.env.SIP_PASSWORD || 'your_password',
    domain: process.env.SIP_DOMAIN || 'your_domain.com',
    displayName: process.env.SIP_DISPLAY_NAME || 'Your Name'
  },
  tts: {
    lang: process.env.TTS_LANG || 'en',
    slow: process.env.TTS_SLOW === 'true' || false
  }
};

let dialer = null;
let ttsService = null;

/**
 * Initialize the SIP dialer and TTS service
 */
async function initialize() {
  try {
    logger.info('Initializing SIP dialer...');
    dialer = new SipDialer(config.sip);
    
    logger.info('Initializing TTS service...');
    ttsService = new TtsService(config.tts);
    
    logger.info('Initialization complete');
  } catch (error) {
    logger.error(`Initialization failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Clean up resources
 */
async function shutdown() {
  try {
    if (dialer) {
      await dialer.disconnect();
    }
    logger.info('Shutdown complete');
  } catch (error) {
    logger.error(`Error during shutdown: ${error.message}`);
  }
}

/**
 * Validate and format phone number for SIP URI
 * @param {string} phoneNumber - Phone number to validate
 * @returns {string} - SIP URI
 */
function formatSipUri(phoneNumber) {
  // Remove any non-digit characters except leading +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Ensure it starts with + if not already
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  // For simplicity, we're using the same domain as configured
  // In a real implementation, you might extract domain from the number or use a different approach
  return `sip:${cleaned.substring(1)}@${config.sip.domain}`;
}

// Initialize the application
initialize().then(() => {
  // Define CLI commands
  program
    .name('sip-dialer')
    .description('CLI for SIP-based softphone with TTS capabilities')
    .version('1.0.0');

  // Dial command
  program
    .command('dial <number>')
    .description('Dial a phone number')
    .option('-t, --text <text>', 'Text to speak when call is answered (uses TTS)')
    .action(async (number, options) => {
      try {
        // Validate phone number
        if (!isValidPhoneNumber(number)) {
          throw new Error('Invalid phone number format. Please use E.164 format (e.g., +1234567890)');
        }

        logger.info(`Dialing number: ${number}`);
        
        // Format as SIP URI
        const sipUri = formatSipUri(number);
        logger.debug(`SIP URI: ${sipUri}`);
        
        // Make the call
        const session = await dialer.call(sipUri);
        logger.info(`Call initiated to ${number}`);

        // If text-to-speech is provided, set up to play when call is answered
        if (options.text) {
          logger.info(`TTS text provided: ${options.text}`);
          // In a full implementation, we would attach a handler to the 'connected' event
          // to play the TTS audio. For now, we'll just log that we would do this.
          logger.info('Would play TTS audio on call answer (feature to be implemented by TTS service integration)');
        }

        // Keep the process alive for the call
        logger.info('Call active. Press Ctrl+C to hang up.');
        
        // Wait for user to hang up (simplified)
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', () => {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          dialer.hangup().then(() => {
            logger.info('Call hung up by user');
            shutdown().then(() => process.exit(0));
          }).catch(err => {
            logger.error(`Error hanging up: ${err.message}`);
            shutdown().then(() => process.exit(1));
          });
        });

      } catch (error) {
        logger.error(`Failed to dial: ${error.message}`);
        shutdown().then(() => process.exit(1));
      }
    });

  // Hangup command
  program
    .command('hangup')
    .description('Hang up the current call')
    .action(async () => {
      try {
        if (!dialer) {
          throw new Error('Dialer not initialized');
        }
        
        await dialer.hangup();
        logger.info('Call hung up');
        await shutdown();
        process.exit(0);
      } catch (error) {
        logger.error(`Failed to hang up: ${error.message}`);
        await shutdown();
        process.exit(1);
      }
    });

  // Status command
  program
    .command('status')
    .description('Show current SIP registration and call status')
    .action(async () => {
      try {
        if (!dialer) {
          throw new Error('Dialer not initialized');
        }
        
        const registered = dialer.isRegisteredStatus();
        const session = dialer.getSession();
        
        console.log('SIP Dialer Status:');
        console.log(`  Registered: ${registered}`);
        console.log(`  Active Call: ${session ? 'Yes' : 'No'}`);
        
        if (session) {
          console.log(`  Session ID: ${session.id || 'unknown'}`);
        }
        
        process.exit(0);
      } catch (error) {
        logger.error(`Failed to get status: ${error.message}`);
        process.exit(1);
      }
    });

  // Parse arguments
  program.parse(process.argv);

  // If no command provided, show help
  if (!program.args.length) {
    program.help();
  }
});

// Handle shutdown signals
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down...');
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down...');
  await shutdown();
  process.exit(0);
});