const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth:
    {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

function sendEmail(to, subject, htmlContent)
{
    return transporter.sendMail(
        {
            from: `"LinkArts" <${ process.env.EMAIL_USER }>`,
            to,
            subject,
            html: htmlContent,
        });
}

module.exports = { sendEmail };
