const express = require('express');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@adiwajshing/baileys');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // for logos, CSS if any

// Serve HTML pages
app.get('/', (req, res) => res.send(`
  <h1>${config.BOT_NAME} WhatsApp Bot</h1>
  <p><a href="/qr">QR Login</a> | <a href="/pair">Pairing Code</a></p>
`));

// Import route handlers
const pairRoute = require('./pair');
const qrRoute = require('./qr');
app.use('/pair', pairRoute);
app.use('/qr', qrRoute);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// ------------------ BOT LOGIC ------------------
let sock = null;
let botNumber = null;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(config.SESSION_DIR);
  
  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false, // we'll handle QR via web
    browser: ['KINGSLEY-XD Bot', 'Safari', '1.0.0']
  });

  // Save credentials on update
  sock.ev.on('creds.update', saveCreds);

  // Handle connection updates
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('QR received (via web)');
      // QR will be shown on /qr page
    }
    if (connection === 'open') {
      botNumber = sock.user?.id.split(':')[0] || 'Unknown';
      config.OWNER_NUMBER = botNumber;
      console.log(`✅ Bot connected as ${botNumber}`);
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    }
  });

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
    const from = m.key.remoteJid;
    const isGroup = from.endsWith('@g.us');

    // Auto typing (if enabled)
    if (config.AUTO_TYPING) {
      await sock.sendPresenceUpdate('composing', from);
    }

    // Auto react (if enabled)
    if (config.AUTO_REACT) {
      await sock.sendMessage(from, { react: { text: config.REACT_EMOJI, key: m.key } });
    }

    // Auto reply (simple keyword match)
    if (config.AUTO_REPLY) {
      for (const [key, reply] of Object.entries(config.AUTO_REPLIES)) {
        if (text.toLowerCase().includes(key.toLowerCase())) {
          await sock.sendMessage(from, { text: reply }, { quoted: m });
          break;
        }
      }
    }

    // Command handling
    if (!text.startsWith(config.PREFIX)) return;
    const args = text.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    switch (cmd) {
      case 'ping':
        await sock.sendMessage(from, { text: 'Pong!' }, { quoted: m });
        break;

      case 'apk':
        if (!args.length) {
          await sock.sendMessage(from, { text: 'Usage: .apk <app name>' });
          return;
        }
        const query = args.join(' ');
        try {
          const gplay = require('google-play-scraper');
          const apps = await gplay.search({ term: query, num: config.APK_MAX_RESULTS });
          if (!apps.length) {
            await sock.sendMessage(from, { text: 'No apps found.' });
            return;
          }
          let reply = '*APK Download Results:*\n';
          apps.forEach((app, i) => {
            reply += `\n${i+1}. *${app.title}*\n   ID: ${app.appId}\n   Downloads: ${app.minInstalls}\n`;
          });
          await sock.sendMessage(from, { text: reply });
        } catch (err) {
          await sock.sendMessage(from, { text: 'Error fetching apps. Try later.' });
        }
        break;

      case 'menu':
      case 'systemmenu':
        let menu = `*${config.BOT_NAME} System Menu*\n\n`;
        menu += `*User:* ${botNumber}\n`;
        menu += `*Prefix:* ${config.PREFIX}\n`;
        menu += `*Commands:*\n`;
        menu += `📌 .ping - Check bot response\n`;
        menu += `📌 .apk <name> - Search APK\n`;
        menu += `📌 .groupmenu - Group commands\n`;
        menu += `📌 .systemmenu - This menu\n`;
        menu += `\n_Auto features: ${config.AUTO_TYPING ? 'Typing' : ''} ${config.AUTO_REACT ? 'React' : ''} ${config.AUTO_REPLY ? 'Reply' : ''}_`;
        await sock.sendMessage(from, { text: menu });
        break;

      case 'groupmenu':
        if (!isGroup) {
          await sock.sendMessage(from, { text: 'This command only works in groups.' });
          return;
        }
        let gmenu = `*${config.BOT_NAME} Group Menu*\n\n`;
        gmenu += `• .tagall - Mention all members (coming soon)\n`;
        gmenu += `• .poll - Create a poll (coming soon)\n`;
        gmenu += `• .kick @user - Remove member (coming soon)`;
        await sock.sendMessage(from, { text: gmenu });
        break;

      default:
        // unknown command
        break;
    }
  });
}

startBot().catch(err => console.error('Fatal bot error:', err));
