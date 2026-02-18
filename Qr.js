const express = require('express');
const router = express.Router();
const path = require('path');
const qrcode = require('qrcode');
const { default: makeWASocket, useMultiFileAuthState } = require('@adiwajshing/baileys');

let qrString = null;

// In a real implementation, you'd share a global socket reference.
// For simplicity, we generate a new socket each time, but that's inefficient.
// Better: have a global socket and listen for QR updates.
// We'll simulate by storing last QR.

router.get('/', (req, res) => {
  // Attempt to create a socket and capture QR
  (async () => {
    const { state } = await useMultiFileAuthState('./sessions');
    const sock = makeWASocket({ auth: state, printQRInTerminal: false });
    
    sock.ev.on('connection.update', async (update) => {
      if (update.qr) {
        qrString = update.qr;
        // Render the HTML with QR
        const qrImage = await qrcode.toDataURL(qrString);
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>QR Login</title>
            <style>
              body { font-family: Arial; text-align: center; padding: 50px; background: #0a0a0a; color: #fff; }
              .qr-container { background: white; display: inline-block; padding: 20px; border-radius: 20px; }
              img { width: 300px; height: 300px; }
              .footer { margin-top: 30px; color: #888; }
            </style>
          </head>
          <body>
            <h1>Scan QR with WhatsApp</h1>
            <div class="qr-container">
              <img src="${qrImage}" alt="QR Code" />
            </div>
            <p class="footer">Powered by KINGSLEY-XD</p>
          </body>
          </html>
        `);
      }
    });
  })();
});

module.exports = router;
