module.exports = {
    setupdone: 'true',

    /**
     * Informations à propos du compte Twilio
     */
    accountSid: '',
    authToken: '',
    callerid: '',
    /**
     * Informations à propos de l'API
     */
    apipassword: '',
    serverurl: '',

    /**
     * Informations à propos du webhook discord
     */
    discordwebhook: '',

    /**
     * Port sur lequel tourne le serveur express
     */
    port: process.env.PORT || 3307,

    /**
     * Chemins de stockage des fichiers audios
     */
    audioPath: './public/audio/',

    /**
     * Configuration TTS (Text-to-Speech)
     */
    tts: {
        defaultProvider: 'polly', // polly, google, espeak
        defaultLanguage: 'en-US',
        defaultVoice: null, // null means use provider default
        polly: {
            accessKeyId: '', // AWS access key ID
            secretAccessKey: '', // AWS secret access key
            region: 'us-east-1'
        },
        google: {
            keyFile: '' // Path to Google service account key file
        }
    },

    /**
     * Contenu des sms selon les services demandés
     */
    paypalsms: 'pp test 123'
};
