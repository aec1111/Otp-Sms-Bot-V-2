const SIP = require('jssip');
const logger = require('../utils/logger');
const { SipTimeoutError, NetworkError } = require('../utils/errors');
const { validateSipCredentials } = require('../utils/validation');

class SipDialer {
  constructor(config) {
    // Validate credentials
    const validation = validateSipCredentials(
      config.username,
      config.password,
      config.domain
    );
    
    if (!validation.isValid) {
      throw new Error(`SIP credential validation failed: ${validation.errors.join(', ')}`);
    }
    
    this.config = {
      username: config.username,
      password: config.password,
      domain: config.domain,
      displayName: config.displayName || config.username,
      ...config
    };
    
    this.ua = null;
    this.session = null;
    this.isRegistered = false;
    
    // Initialize UA
    this.initUa();
  }
  
  initUa() {
    const socket = new SIP.WebSocketInterface(`wss://${this.config.domain}`);
    
    this.ua = new SIP.UA({
      sockets: [socket],
      uri: `sip:${this.config.username}@${this.config.domain}`,
      displayName: this.config.displayName,
      password: this.config.password,
      register: true,
      registerExpires: 300,
      connectionRecoveryMaxAttempts: 3,
      ...this.config.uaConfig || {}
    });
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.ua.on('registered', () => {
      this.isRegistered = true;
      logger.info('SIP registered successfully');
    });
    
    this.ua.on('unregistered', () => {
      this.isRegistered = false;
      logger.info('SIP unregistered');
    });
    
    this.ua.on('registrationFailed', (response) => {
      logger.error(`SIP registration failed: ${response.status_code}`);
      // Don't throw here as registration might recover
    });
    
    this.ua.on('newRTCSession', (session) => {
      logger.info('New RTC session initiated');
      this.session = session;
      
      session.on('connected', () => {
        logger.info('SIP session connected');
      });
      
      session.on('failed', (error) => {
        logger.error(`SIP session failed: ${error}`);
        this.session = null;
      });
      
      session.on('ended', () => {
        logger.info('SIP session ended');
        this.session = null;
      });
      
      session.on('progress', (response) => {
        logger.debug(`SIP session progress: ${response.status_code}`);
      });
    });
    
    this.ua.on('iceFailed', () => {
      logger.error('ICE failed');
    });
    
    this.ua.on('transportError', (error) => {
      logger.error(`Transport error: ${error}`);
    });
  }
  
  /**
   * Register with SIP server
   * @returns {Promise<void>}
   */
  async register() {
    if (!this.ua) {
      throw new Error('UA not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const registerTimeout = setTimeout(() => {
        reject(new SipTimeoutError('SIP registration timeout'));
      }, 10000); // 10 second timeout
      
      const onRegistered = () => {
        clearTimeout(registerTimeout);
        this.ua.removeListener('registered', onRegistered);
        this.ua.removeListener('registrationFailed', onRegistrationFailed);
        resolve();
      };
      
      const onRegistrationFailed = (response) => {
        clearTimeout(registerTimeout);
        this.ua.removeListener('registered', onRegistered);
        this.ua.removeListener('registrationFailed', onRegistrationFailed);
        reject(new Error(`SIP registration failed: ${response.status_code}`));
      };
      
      this.ua.on('registered', onRegistered);
      this.ua.on('registrationFailed', onRegistrationFailed);
      
      // Start registration if not already registered
      if (!this.isRegistered) {
        this.ua.register();
      } else {
        clearTimeout(registerTimeout);
        resolve();
      }
    });
  }
  
  /**
   * Make an outbound call
   * @param {string} target - Target SIP URI (e.g., sip:1234567890@domain.com)
   * @returns {Promise<Object>} - Session object
   */
  async call(target) {
    if (!this.isRegistered) {
      await this.register();
    }
    
    if (!this.ua) {
      throw new Error('UA not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const callTimeout = setTimeout(() => {
        reject(new SipTimeoutError('Call timeout'));
      }, 30000); // 30 second timeout
      
      try {
        const session = this.ua.call(target, {
          // Media constraints can be added here
          ...this.config.callConfig || {}
        });
        
        // Store session reference
        this.session = session;
        
        // Session event handlers
        const onConnected = () => {
          clearTimeout(callTimeout);
          this.removeSessionListeners();
          logger.info('Call connected');
          resolve(session);
        };
        
        const onFailed = (error) => {
          clearTimeout(callTimeout);
          this.removeSessionListeners();
          logger.error(`Call failed: ${error}`);
          reject(new Error(`Call failed: ${error}`));
        };
        
        const onEnded = () => {
          clearTimeout(callTimeout);
          this.removeSessionListeners();
          logger.info('Call ended');
          this.session = null;
        };
        
        session.on('connected', onConnected);
        session.on('failed', onFailed);
        session.on('ended', onEnded);
        
        // Cleanup function
        const removeSessionListeners = () => {
          session.removeListener('connected', onConnected);
          session.removeListener('failed', onFailed);
          session.removeListener('ended', onEnded);
        };
        
        this.removeSessionListeners = removeSessionListeners;
        
      } catch (error) {
        clearTimeout(callTimeout);
        logger.error(`Error making call: ${error}`);
        reject(error);
      }
    });
  }
  
  /**
   * Answer an incoming call
   * @returns {Promise<void>}
   */
  async answer() {
    if (!this.session) {
      throw new Error('No incoming session to answer');
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.session.answer();
        logger.info('Call answered');
        resolve();
      } catch (error) {
        logger.error(`Error answering call: ${error}`);
        reject(error);
      }
    });
  }
  
  /**
   * End the current call
   * @returns {Promise<void>}
   */
  async hangup() {
    if (!this.session) {
      logger.warn('No active session to hangup');
      return;
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.session.terminate();
        logger.info('Call terminated');
        resolve();
      } catch (error) {
        logger.error(`Error ending call: ${error}`);
        reject(error);
      }
    });
  }
  
  /**
   * Hold the current call
   * @returns {Promise<void>}
   */
  async hold() {
    if (!this.session) {
      throw new Error('No active session to hold');
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.session.hold();
        logger.info('Call held');
        resolve();
      } catch (error) {
        logger.error(`Error holding call: ${error}`);
        reject(error);
      }
    });
  }
  
  /**
   * Unhold the current call
   * @returns {Promise<void>}
   */
  async unhold() {
    if (!this.session) {
      throw new Error('No active session to unhold');
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.session.unhold();
        logger.info('Call unheld');
        resolve();
      } catch (error) {
        logger.error(`Error unholding call: ${error}`);
        reject(error);
      }
    });
  }
  
  /**
   * Unregister from SIP server
   * @returns {Promise<void>}
   */
  async unregister() {
    if (!this.ua) {
      return;
    }
    
    return new Promise((resolve, reject) => {
      const unregisterTimeout = setTimeout(() => {
        reject(new SipTimeoutError('SIP unregistration timeout'));
      }, 10000);
      
      const onUnregistered = () => {
        clearTimeout(unregisterTimeout);
        this.ua.removeListener('unregistered', onUnregistered);
        this.isRegistered = false;
        resolve();
      };
      
      const onRegistrationFailed = (response) => {
        clearTimeout(unregisterTimeout);
        this.ua.removeListener('unregistered', onUnregistered);
        reject(new Error(`SIP unregistration failed: ${response.status_code}`));
      };
      
      this.ua.on('unregistered', onUnregistered);
      this.ua.on('registrationFailed', onRegistrationFailed);
      
      try {
        this.ua.unregister();
      } catch (error) {
        clearTimeout(unregisterTimeout);
        this.ua.removeListener('unregistered', onUnregistered);
        this.ua.removeListener('registrationFailed', onRegistrationFailed);
        reject(error);
      }
    });
  }
  
  /**
   * Disconnect and clean up
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (this.session) {
        await this.hangup();
      }
      
      if (this.isRegistered) {
        await this.unregister();
      }
      
      if (this.ua) {
        this.ua.stop();
        this.ua = null;
      }
      
      logger.info('SIP disconnected and cleaned up');
    } catch (error) {
      logger.error(`Error during SIP disconnect: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get registration status
   * @returns {boolean}
   */
  isRegisteredStatus() {
    return this.isRegistered;
  }
  
  /**
   * Get current session
   * @returns {Object|null}
   */
  getSession() {
    return this.session;
  }
}

module.exports = SipDialer;