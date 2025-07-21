

// Twilio Service for SakthiAdmin Server
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_FROM_NUMBER;

const client = twilio(accountSid, authToken);

/**
 * Send an SMS using Twilio
 * @param {string} to - Recipient phone number
 * @param {string} body - Message body
 * @returns {Promise}
 */
function sendSMS(to, body) {
  return client.messages.create({
    body,
    from: twilioPhone,
    to,
  });
}

/**
 * Send a custom message to a specific number
 * @param {string} number - Recipient phone number
 * @param {string} message - Message body
 * @returns {Promise}
 */
function customMessage(number, message) {
  return sendSMS(number, message);
}

export default {
  sendSMS,
  customMessage,
};