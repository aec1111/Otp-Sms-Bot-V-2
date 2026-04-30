const { SIPClient } = require('./dist/sipClient');

// Example configuration (replace with actual SIP credentials)
const config = {
  uri: 'sip:username@domain.com', // e.g., 'sip:1234@sip.provider.com'
  password: 'your-password',
  registerExpires: 300 // 5 minutes
};

// Create SIP client instance
const sipClient = new SIPClient(config);

// Example usage
async function main() {
  try {
    console.log('Connecting to SIP server...');
    await sipClient.connect();
    console.log('Connected and registered!');
    
    // Make a call (replace with actual target)
    // const target = 'sip:5678@domain.com';
    // console.log(`Calling ${target}...`);
    // const session = await sipClient.call(target);
    // console.log('Call established!');
    
    // For demonstration, we'll just keep the connection alive for a bit
    setTimeout(async () => {
      console.log('Disconnecting...');
      await sipClient.disconnect();
      console.log('Disconnected.');
    }, 5000);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();