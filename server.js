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
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
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
    console.log('WhatsApp Disconnected!');
    isClientReady = false;
});

client.initialize();

app.get('/get-qr', (req, res) => {
    if (isClientReady) {
        return res.json({ status: 'connected', qr: '' });
    }
    res.json({ status: 'pending', qr: qrCodeData });
});

app.get('/status', (req, res) => {
    res.json({ ready: isClientReady });
});

app.post('/api/send-message', async (req, res) => {
    if (!isClientReady) {
        return res.status(400).json({ status: 'error', message: 'WhatsApp connected nahi hai!' });
    }

    const { phone, message } = req.body;
    if (!phone || !message) {
        return res.status(400).json({ status: 'error', message: 'Phone number aur message zaroori hain.' });
    }

    try {
        const chatId = `${phone}@c.us`;
        await client.sendMessage(chatId, message);
        res.json({ status: 'success', message: 'Message bhej diya gaya hai!' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
