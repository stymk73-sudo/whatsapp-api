const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

let qrCodeData = '';
let isClientReady = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        qrCodeData = url;
    });
    isClientReady = false;
});

client.on('ready', () => {
    console.log('WhatsApp Connected!');
    isClientReady = true;
    qrCodeData = '';
});

client.on('disconnected', () => {
    isClientReady = false;
});

client.initialize();

app.get('/get-qr', (req, res) => {
    if (isClientReady) {
        return res.json({ status: 'connected', qr: '' });
    }
    res.json({ status: 'pending', qr: qrCodeData });
});

app.post('/api/send-message', async (req, res) => {
    if (!isClientReady) {
        return res.status(400).json({ status: 'error', message: 'WhatsApp connected nahi hai!' });
    }
    const { phone, message } = req.body;
    if (!phone || !message) {
        return res.status(400).json({ status: 'error', message: 'Details incomplete hain.' });
    }
    try {
        await client.sendMessage(`${phone}@c.us`, message);
        res.json({ status: 'success', message: 'Message sent!' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));