const express = require('express');
const router = express.Router();
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState } = require('@adiwajshing/baileys');

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'pair.html'));
});

router.post('/', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.send('Phone number is required. <a href="/pair">Go back</a>');
  }

  try {
    const { state } = await useMultiFileAuthState('./sessions');
    const sock = makeWASocket({ auth: state, printQRInTerminal: false });
    
    let code = await sock.requestPairingCode(phone);
    code = code?.match(/.{1,4}/g)?.join('-') || code;
    
    res.send(`
      <h2>Pairing Code</h2>
      <p style="font-size:24px;font-weight:bold;">${code}</p>
      <p>Enter this code in your WhatsApp (Linked Devices).</p>
      <p><a href="/">Home</a></p>
    `);
  } catch (err) {
    res.send(`Error: ${err.message}. <a href="/pair">Try again</a>`);
  }
});

module.exports = router;
