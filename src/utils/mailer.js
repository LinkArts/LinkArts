const nodemailer = require('nodemailer');
require('dotenv').config();

const path = require('path');
const handlebars = require('handlebars');
const fs = require('fs');

function getTemplate(templateName)
{
    const templatePath = path.join(__dirname, `../public/html/${templateName}.html`);
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    
    const template = handlebars.compile(templateSource);

    return template
}

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

module.exports = { sendEmail, getTemplate };
