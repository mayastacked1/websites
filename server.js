const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the HTML file from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Temporary database for login codes
const loginCodes = {};

// Setup Resend with your Environment Variable
const resend = new Resend(process.env.RESEND_API_KEY);

// 1. Endpoint to send the code
app.post('/api/send', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const code = crypto.randomInt(100000, 999999).toString();
    loginCodes[email] = { code, expiresAt: Date.now() + 300000 }; // 5 mins

    try {
        // Send email using Resend's default free email address
        await resend.emails.send({
            from: 'onboarding@resend.dev', 
            to: email,
            subject: 'Your StudyAI Login Code',
            html: `<h2>Login Verification</h2><p>Your code is: <h1 style="color:blue;">${code}</h1></p>`
        });
        res.json({ success: true, message: 'Code sent!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to send email.' });
    }
});

// 2. Endpoint to verify the code
app.post('/api/verify', (req, res) => {
    const { email, code } = req.body;
    const storedData = loginCodes[email];

    if (!storedData) return res.status(400).json({ error: 'No code requested.' });
    if (Date.now() > storedData.expiresAt) return res.status(400).json({ error: 'Code expired.' });
    
    if (storedData.code === code) {
        delete loginCodes[email];
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Invalid code.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
