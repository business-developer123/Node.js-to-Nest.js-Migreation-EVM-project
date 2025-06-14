require("dotenv").config();
const SendGrid = require('@sendgrid/mail')
SendGrid.setApiKey(process.env.SENDGRID_API_KEY)

async function sendEmail(from, html, subject, to, fromName = "noreply", attachments = []) {
    var errorMessage = null
    let fromNameEmail = fromName.replace(/\s/g, '')
    var email = {
        from: {
            email: `${fromNameEmail.toLowerCase()}@${fromNameEmail.toLowerCase()}.com`,
            name: fromName
        },
        replyTo: `no-reply@${fromNameEmail.toLowerCase()}.com`,
        html: html,
        subject: subject,
        to: to,
        attachments,
    }

    await SendGrid.send(email).catch((error) => {
        errorMessage = `Failed to send email. [error = ${error}]`
        console.error(errorMessage)
    })

    if (errorMessage) throw errorMessage
}

module.exports = { sendEmail }
