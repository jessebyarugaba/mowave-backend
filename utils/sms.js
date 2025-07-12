const axios = require('axios');
require('dotenv').config();

async function sendSMS(number, message) {
    const apiUrl = 'https://www.egosms.co/api/v1/plain/';

    const params = {
        number,
        message,
        username: process.env.EGO_SMS_USERNAME,
        password: process.env.EGO_SMS_PASSWORD,
        sender: process.env.EGO_SMS_SENDERNAME,
        priority: 0,
    };

    try {
        const res = await axios.get(apiUrl, { params });
        return res.data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

module.exports = { sendSMS };
