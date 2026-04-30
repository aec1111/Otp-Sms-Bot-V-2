// TTS Service - supports multiple providers: AWS Polly, Google Cloud Text-to-Speech, eSpeak
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
let polly = null;
let textToSpeechClient = null;

// Configuration
let config = {};

/**
 * Initialize TTS service with configuration
 * @param {Object} cfg - Configuration object
 */
function init(cfg) {
  config = cfg || {};
  // Initialize AWS Polly if credentials are available
  if (config.polly && config.polly.accessKeyId && config.polly.secretAccessKey) {
    const AWS = require('aws-sdk');
    polly = new AWS.Polly({
      accessKeyId: config.polly.accessKeyId,
      secretAccessKey: config.polly.secretAccessKey,
      region: config.polly.region || 'us-east-1'
    });
  }
  // Initialize Google TTS if credentials are available
  if (config.google && config.google.keyFile) {
    const { TextToSpeechClient } = require('@google-cloud/text-to-speech').v1p1beta1 || require('@google-cloud/text-to-speech');
    textToSpeechClient = new TextToSpeechClient({
      keyFilename: config.google.keyFile
    });
  }
}

/**
 * Synthesize speech to audio buffer
 * @param {string} text - Text to synthesize
 * @param {Object} options - Voice options (language, voice, etc.)
 * @returns {Promise<Buffer>} Audio buffer in MP3 format
 */
async function synthesize(text, options = {}) {
  const provider = options.provider || config.defaultProvider || 'polly';
  const language = options.language || config.defaultLanguage || 'en-US';
  const voice = options.voice || config.defaultVoice || null;

  switch (provider) {
    case 'polly':
      return await synthesizePolly(text, { language, voice });
    case 'google':
      return await synthesizeGoogle(text, { language, voice });
    case 'espeak':
      return await synthesizeEspeak(text, { language, voice });
    default:
      throw new Error(`Unsupported TTS provider: ${provider}`);
  }
}

/**
 * Synthesize using AWS Polly
 */
async function synthesizePolly(text, { language, voice }) {
  if (!polly) {
    throw new Error('Polly not initialized. Check AWS credentials.');
  }
  
  const params = {
    OutputFormat: 'mp3',
    Text: text,
    VoiceId: voice || (language.startsWith('en') ? 'Joanna' : 'Matthew'),
    LanguageCode: language
  };

  try {
    const result = await polly.synthesizeSpeech(params).promise();
    return Buffer.from(result.AudioStream);
  } catch (error) {
    throw new Error(`Polly TTS failed: ${error.message}`);
  }
}

/**
 * Synthesize using Google Cloud Text-to-Speech
 */
async function synthesizeGoogle(text, { language, voice }) {
  if (!textToSpeechClient) {
    throw new Error('Google TTS not initialized. Check credentials.');
  }
  
  const request = {
    input: { text: text },
    voice: { languageCode: language, name: voice },
    audioConfig: { audioEncoding: 'MP3' }
  };

  try {
    const [response] = await textToSpeechClient.synthesizeSpeech(request);
    return Buffer.from(response.audioContent, 'binary');
  } catch (error) {
    throw new Error(`Google TTS failed: ${error.message}`);
  }
}

/**
 * Synthesize using eSpeak
 */
async function synthesizeEspeak(text, { language, voice }) {
  // Map language to eSpeak language code
  const langMap = {
    'en-US': 'en',
    'en-GB': 'en',
    'fr-FR': 'fr',
    'de-DE': 'de',
    'es-ES': 'es'
  };
  const espeakLang = langMap[language] || 'en';

  // Voice variant (optional)
  const voiceParam = voice ? `-v ${voice}` : '';

  // Create temporary file path
  const tempFile = path.join(__dirname, `../tmp/tts_${Date.now()}_${Math.random().toString(36).substring(2, 15)}.wav`);
  
  // Ensure tmp directory exists
  const tmpDir = path.join(__dirname, '../tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  try {
    // Use eSpeak to generate WAV file
    const { stdout, stderr } = await exec(`espeak ${voiceParam} -v ${espeakLang} -w "${tempFile}" "${text}"`);
    if (stderr) {
      console.warn(`eSpeak warning: ${stderr}`);
    }

    // Read the generated WAV file
    const wavBuffer = await promisify(fs.readFile)(tempFile);
    
    // Convert WAV to MP3 (optional, but we'll keep as WAV for now and let Twilio handle)
    // For simplicity, we'll return WAV and note that Twilio may need MP3
    // In production, you might want to convert to MP3 or μ-law
    return wavBuffer;
  } catch (error) {
    throw new Error(`eSpeak TTS failed: ${error.message}`);
  } finally {
    // Clean up temporary file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

/**
 * Get TwiML Say verb for given text and voice options
 * @param {string} text - Text to speak
 * @param {Object} options - Voice options
 * @returns {string} TwiML XML string
 */
function getSayTwiML(text, options = {}) {
  const language = options.language || config.defaultLanguage || 'en-US';
  const voice = options.voice || config.defaultVoice || 
                (language.startsWith('en') ? 'Polly.Joanna' : 
                 language.startsWith('fr') ? 'Polly.Mathieu' :
                 language.startsWith('de') ? 'Polly.Hans' :
                 language.startsWith('es') ? 'Polly.Conchita' : 'Polly.Joanna');

  return `<Say voice="${voice}" language="${language}">${text}</Say>`;
}

/**
 * Get TwiML Play verb for given audio buffer
 * @param {Buffer} audioBuffer - Audio buffer (preferably MP3 or WAV)
 * @returns {Promise<string>} TwiML XML string with Play verb
 */
async function getPlayTwiML(audioBuffer) {
  // Save audio to public directory and return URL
  // For simplicity, we'll assume there's a /audio endpoint that serves files
  // In a real implementation, you'd upload to S3 or similar and return public URL
  const filename = `tts_${Date.now()}_${Math.random().toString(36).substring(2, 15)}.mp3`;
  const uploadsDir = path.join(__dirname, '../public/audio');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const filePath = path.join(uploadsDir, filename);
  await promisify(fs.writeFile)(filePath, audioBuffer);
  
  // Return TwiML Play verb with URL to the audio file
  // Assuming server URL is available in config
  const serverUrl = config.serverurl || 'http://localhost:3307';
  return `<Play>${serverUrl}/audio/${filename}</Play>`;
}

module.exports = {
  init,
  synthesize,
  getSayTwiML,
  getPlayTwiML
};