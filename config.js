module.exports = {
  // General settings
  BOT_NAME: process.env.BOT_NAME || 'KINGSLEY-XD',
  OWNER_NUMBER: '', // will be auto-filled after login
  PREFIX: '.',
  
  // Feature toggles
  AUTO_TYPING: true,
  AUTO_REACT: true,
  AUTO_REPLY: true,
  
  // Auto-react emoji (if enabled)
  REACT_EMOJI: '🤖',
  
  // Auto-reply dictionary (key → response)
  AUTO_REPLIES: {
    'hello': 'Hello! How can I help?',
    'hi': 'Hi there!',
    'bot': 'Yes, I am a bot powered by KINGSLEY-XD',
  },
  
  // APK downloader settings
  APK_MAX_RESULTS: 3,
  
  // Session folder
  SESSION_DIR: './sessions'
};
