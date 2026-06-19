const nodemailer = require('nodemailer');
const crypto = require('crypto');

// This temporary database resets every time the server sleeps.
// For a real app, you'd use a database like Firebase or Supabase.
const loginCodes = {};

module.exports = async (req, res) => {
    // Handle sending the email
    if (req.url.includes('/api/send')) {
        const { email } = req.body;

        if (!email) return res.status(400).json({ error: 'Email is required' });

        const code = crypto.randomInt(100000, 999999).toString();
        loginCodes[email] = { code, expiresAt: Date.now() + 300000 };

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, // We will set this in Vercel
                pass: process.env.GMAIL_PASS   // We will set this in Vercel
            }
        });

        try {
            await transporter.sendMail({
                from: `"StudyAI" <${process.env.GMAIL_USER}>`,
                to: email,
                subject: 'Your StudyAI Login Code',
                html: `<h2>Login Verification</h2><p>Your code is: <h1 style="color:blue;">${code}</h1></p>`
            });
            res.json({ success: true, message: 'Code sent!' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to send email.' });
        }
    }

    // Handle verifying the code
    if (req.url.includes('/api/verify')) {
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
    }
};
