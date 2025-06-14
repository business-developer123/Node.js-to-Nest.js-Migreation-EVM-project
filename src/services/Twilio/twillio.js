require("dotenv").config();

const twilioClient = require('twilio')(
    process.env.TWILIO_ACCOUNT_ID,
    process.env.TWILIO_AUTH_TOKEN,
    {
        logLevel: 'debug',
    }
);

async function sendMessage (phoneNumber, textBody){
    const number = process.env.TWILIO_PHONE_NUMBER;
    await twilioClient.messages.create({
        to: `+${phoneNumber}`,
        from: number,
        body: textBody,
    });
};


module.exports = {
    sendMessage,
}
