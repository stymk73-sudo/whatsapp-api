const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const qrcode = require('qrcode');
const cors = require('cors');
const pino = require('pino');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

let qrCodeData = '';
let sock = null;
let isConnected = false;

async function startWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
    });

    sock.udarstven = saveCreds;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrcode.toDataURL(qr, (err, url) => {
                qrCodeData = url;
            });
            isConnected = false;
        }

        if (connection === 'open') {
            console.log('WhatsApp Connected Successfully!');
            isConnected = true;
            qrCodeData = '';
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnecting...', shouldReconnect);
            isConnected = false;
            if (shouldReconnect) {
                startWhatsApp();
            }
        }
    });
}

startWhatsApp();

// Frontend ke liye QR code route
app.get('/get-qr', (req, res) => {
    if (isConnected) {
        return res.json({ status: 'connected', qr: '' });
    }
    res.json({ status: 'pending', qr: qrCodeData });
});

// Message bhejne ki API
app.post('/api/send-message', async (req, res) => {
    if (!isConnected || !sock) {
        return res.status(400).json({ status: 'error', message: 'WhatsApp connected nahi hai!' });
    }

    const { phone, message } = req.body;
    if (!phone || !message) {
        return res.status(400).json({ status: 'error', message: 'Phone aur message zaroori hain.' });
    }

    try {
        const jid = `${phone}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
        res.json({ status: 'success', message: 'Message bhej diya gaya hai!' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
