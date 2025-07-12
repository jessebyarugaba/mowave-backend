const express = require('express');
const { sendSMS } = require('../utils/sms');
const router = express.Router();

router.post('/send', async (req, res) => {
    const { number, message } = req.body;
    const result = await sendSMS(number, message);
    res.json({ response: result });
});

module.exports = router;
