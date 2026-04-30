const SIP = require('sip');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info: { timestamp: string; level: string; message: string }) => {
      return `[${info.timestamp}] ${info.level}: ${info.message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'sip-client.log' })
  ]
});

interface SIPClientConfig {
  uri: string;
  password: string;
  registerExpires?: number; // seconds
}

interface SIPClientOptions {
  socket?: any; // Optional transport socket
}

class SIPClient {
  private ua: any;
  private config: SIPClientConfig;
  private isRegistered: boolean = false;
  private session: any = null; // Current session (call)

  constructor(config: SIPClientConfig, options: SIPClientOptions = {}) {
    this.config = config;
    this.ua = new SIP.UA({
      uri: config.uri,
      password: config.password,
      registerExpires: config.registerExpires || 300,
      ...options
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.ua.on('registered', () => {
      this.isRegistered = true;
      logger.info(`SIP registered: ${this.config.uri}`);
    });

    this.ua.on('unregistered', () => {
      this.isRegistered = false;
      logger.info('SIP unregistered');
    });

    this.ua.on('registrationFailed', (response: any, cause: any) => {
      logger.error(`SIP registration failed: ${cause.statusCode || cause}`);
    });

    this.ua.on('invite', (session: any) => {
      logger.info('Incoming call invitation');
      this.session = session;

      // Automatically answer the call (can be modified to prompt)
      session.accept();
    });

    this.ua.on('message', (message: any) => {
      logger.info(`Received message: ${message.body}`);
    });

    this.ua.on('connect', () => {
      logger.info('SIP transport connected');
    });

    this.ua.on('disconnect', (cause: any) => {
      logger.warn(`SIP transport disconnected: ${cause}`);
    });
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ua.start();
      // The UA starts trying to connect and register immediately
      // We'll resolve when registered, but also handle failure
      const checkRegistration = setInterval(() => {
        if (this.isRegistered) {
          clearInterval(checkRegistration);
          resolve();
        }
      }, 100);

      // Also reject if registration fails after a timeout
      setTimeout(() => {
        clearInterval(checkRegistration);
        if (!this.isRegistered) {
          reject(new Error('SIP registration timeout'));
        }
      }, 10000);
    });
  }

  public disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ua.stop((error: any) => {
        if (error) {
          logger.error(`Error stopping SIP UA: ${error}`);
          reject(error);
        } else {
          logger.info('SIP UA stopped');
          resolve();
        }
      });
    });
  }

  public register(): Promise<void> {
    // Registration is handled automatically by the UA on start
    // We just wait for the registered event
    return new Promise((resolve, reject) => {
      if (this.isRegistered) {
        resolve();
        return;
      }

      const onRegistered = () => {
        this.ua.removeListener('registered', onRegistered);
        this.ua.removeListener('registrationFailed', onRegistrationFailed);
        resolve();
      };

      const onRegistrationFailed = (response: any, cause: any) => {
        this.ua.removeListener('registered', onRegistered);
        this.ua.removeListener('registrationFailed', onRegistrationFailed);
        logger.error(`SIP registration failed: ${cause.statusCode || cause}`);
        reject(new Error(`SIP registration failed: ${cause.statusCode || cause}`));
      };

      this.ua.on('registered', onRegistered);
      this.ua.on('registrationFailed', onRegistrationFailed);

      // Trigger registration if not already trying
      this.ua.register();
    });
  }

  public unregister(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ua.unregister((error: any, response: any) => {
        if (error) {
          logger.error(`Error unregistering: ${error}`);
          reject(error);
        } else {
          logger.info('SIP unregistered');
          resolve();
        }
      });
    });
  }

  public call(target: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isRegistered) {
        reject(new Error('Not registered'));
        return;
      }

      const session = this.ua.invite(target, {
        // Optional: add session description handlers, etc.
      });

      session.on('accepted', () => {
        logger.info(`Call accepted to ${target}`);
        this.session = session;
        resolve(session);
      });

      session.on('progress', (response: any) => {
        logger.info(`Call progress: ${response.status_code}`);
      });

      session.on('failed', (response: any, cause: any) => {
        logger.error(`Call failed: ${cause}`);
        reject(new Error(`Call failed: ${cause}`));
      });

      session.on('ended', (response: any, cause: any) => {
        logger.info(`Call ended: ${cause}`);
        this.session = null;
      });
    });
  }

  public answer(): void {
    if (this.session) {
      this.session.accept();
      logger.info('Call answered');
    } else {
      logger.warn('No incoming call to answer');
    }
  }

  public hangup(): void {
    if (this.session) {
      this.session.bye();
      logger.info('Call hung up');
      this.session = null;
    } else {
      logger.warn('No active call to hang up');
    }
  }

  public hold(): void {
    if (this.session) {
      this.session.hold();
      logger.info('Call held');
    } else {
      logger.warn('No active call to hold');
    }
  }

  public unhold(): void {
    if (this.session) {
      this.session.unhold();
      logger.info('Call unheld');
    } else {
      logger.warn('No active call to unhold');
    }
  }

  public isRegisteredStatus(): boolean {
    return this.isRegistered;
  }

  public getSession(): any {
    return this.session;
  }
}

// Export a default instance factory if needed
function createSIPClient(config: SIPClientConfig, options?: SIPClientOptions): SIPClient {
  return new SIPClient(config, options);
}

module.exports = { SIPClient, createSIPClient };