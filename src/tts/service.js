const googleTTS = require('google-tts-api');
const logger = require('../utils/logger');
const { TtsApiError, AudioPlaybackError } = require('../utils/errors');

class TtsService {
  constructor(options = {}) {
    this.options = {
      lang: options.lang || 'en',
      slow: options.slow || false,
      host: options.host || 'https://translate.google.com',
      timeout: options.timeout || 10000,
      ...options
    };
    
    logger.info(`TTS service initialized with language: ${this.options.lang}`);
  }
  
  /**
   * Convert text to speech and return audio URL
   * @param {string} text - Text to convert to speech
   * @returns {Promise<string>} - URL to the audio file
   */
  async textToSpeech(text) {
    if (!text || typeof text !== 'string') {
      throw new TtsApiError('Invalid text provided for TTS conversion');
    }
    
    try {
      // Limit text length to prevent abuse
      if (text.length > 5000) {
        throw new TtsApiError('Text too long for TTS conversion (max 5000 characters)');
      }
      
      const url = await googleTTS.getAudioUrl(text, {
        lang: this.options.lang,
        slow: this.options.slow,
        host: this.options.host,
        timeout: this.options.timeout
      });
      
      logger.debug(`TTS URL generated for text: ${text.substring(0, 50)}...`);
      return url;
    } catch (error) {
      logger.error(`TTS API error: ${error.message}`);
      throw new TtsApiError(`TTS API failed: ${error.message}`);
    }
  }
  
  /**
   * Get available languages (subset of Google TTS supported languages)
   * @returns {Array<Object>} - Array of language objects with code and name
   */
  static getAvailableLanguages() {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ar', name: 'Arabic' },
      { code: 'hi', name: 'Hindi' }
    ];
  }
  
  /**
   * Validate if a language code is supported
   * @param {string} langCode - Language code to validate
   * @returns {boolean} - True if supported
   */
  static isLanguageSupported(langCode) {
    return this.getAvailableLanguages().some(lang => lang.code === langCode);
  }
}

module.exports = TtsService;