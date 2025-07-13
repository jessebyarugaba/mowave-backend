const express = require('express');
const pool = require('../db');
const axios = require('axios');
const router = express.Router();

function generateVoucherCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function formatPhoneNumber(localNumber) {
    localNumber = localNumber.trim();
    if (localNumber.startsWith('0')) {
        return '256' + localNumber.substring(1);
    }
    return localNumber;
}

function generatePaymentId() {
    return 'tx_' + Math.random().toString(36).substring(2, 10);
}

router.post('/validate', async (req, res) => {
    const { code } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    try {
        const result = await pool.query('SELECT * FROM vouchers WHERE code = $1 AND is_used = false', [code]);
        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid or already used voucher' });
        }

        // Mark as used
        await pool.query('UPDATE vouchers SET is_used = true, used_at = NOW(), used_by_ip = $1 WHERE code = $2', [ip, code]);

        // Log usage
        await pool.query('INSERT INTO logs (action, voucher_id, ip_address) VALUES ($1, $2, $3)', ['Voucher validated', result.rows[0].id, ip]);

        res.json({ message: 'Voucher validated successfully! You now have access.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error validating voucher' });
    }
});

router.post('/purchase', async (req, res) => {
    const { amount, phone } = req.body;

    const numericAmount = Number(amount);
    if (!numericAmount) {
        return res.status(400).json({ message: 'Amount is required and must be a number.' });
    }

    const formattedPhone = formatPhoneNumber(phone);
    const paymentId = generatePaymentId();

    console.log("Generated paymentId:", paymentId);

    try {
        // Insert payment record first
        const insertResult = await pool.query(
            `INSERT INTO payments (paymentid, amount, paymentmethod, gateway, status)
            VALUES ($1, $2, $3, $4, $5)`,
            [paymentId, numericAmount, formattedPhone, 'Ssentezo', 'pending']
        );

        // Ssentezo API credentials
        const apiUser = process.env.SSENTEZO_USER;
        const apiKey = process.env.SSENTEZO_KEY;
        const encodedString = Buffer.from(`${apiUser}:${apiKey}`).toString('base64');

        const headers = {
            'Authorization': `Basic ${encodedString}`,
            'Content-Type': 'application/json'
        };


        // Build request body
        const requestBody = {
            externalReference: paymentId,
            amount: numericAmount,
            msisdn: formattedPhone,
            reason: 'Test Voucher purchase',
            currency: 'UGX',
            name: '',
            success_callback: 'https://exclusive-madlin-phino-6d7723ae.koyeb.app/voucher/payment-webhook',
            failure_callback: 'https://exclusive-madlin-phino-6d7723ae.koyeb.app/voucher/payment-webhook'
        };

        const response = await axios.post('https://wallet.ssentezo.com/api/deposit', requestBody, { headers });

        if (response.data.response !== 'OK') {
            return res.status(400).json({ message: 'Payment initiation failed at Ssentezo.' });
        }

        const { ssentezoWalletReference, financialTransactionId } = response.data.data;

        // Update transaction record with references
        await pool.query(
            `UPDATE payments
       SET gatewayreference = $1, providerreference = $2
       WHERE paymentid = $3`,
            [ssentezoWalletReference, financialTransactionId, paymentId]
        );

        res.json({ message: 'Payment request sent. Please complete on your phone.' });

    } catch (err) {
        console.error(err.response?.data || err);
        res.status(500).json({ message: 'Error initiating payment.' });
    }
});


router.post('/payment-webhook', async (req, res) => {
    const data = req.body;

    let status = null;
    let externalReference = null;

    if (data.response === 'OK') {
        status = data.data.transactionStatus;
        externalReference = data.data.externalReference;
    } else if (data.response === 'ERROR') {
        status = data.data.transactionStatus;
        externalReference = data.data.externalReference;
    } else {
        console.error("Unknown response received: ", JSON.stringify(data));
        return res.sendStatus(400);
    }

    const paymentStatus = status.toLowerCase(); // success, failed, pending

    try {
        // Find payment by externalReference
        const result = await pool.query(
            `SELECT * FROM payments WHERE paymentid = $1`,
            [externalReference]
        );

        if (result.rows.length === 0) {
            console.error("Payment record not found for reference:", externalReference);
            return res.sendStatus(404);
        }

        const payment = result.rows[0];

        // Update payment status
        await pool.query(
            `UPDATE payments SET status = $1 WHERE paymentid = $2`,
            [paymentStatus, payment.paymentid]
        );

        if (paymentStatus === 'succeeded') {
            // Generate voucher
            const code = generateVoucherCode();
            await pool.query('INSERT INTO vouchers (code, transactionid) VALUES ($1, $2)', [code, payment.paymentid]);

            // Send SMS with voucher
            const { sendSMS } = require('../utils/sms');

            // Format stored phone number if necessary
            let formattedPhone = payment.paymentmethod;
            if (formattedPhone.startsWith('0')) {
                formattedPhone = '+256' + formattedPhone.substring(1);
            } else if (!formattedPhone.startsWith('+')) {
                formattedPhone = '+' + formattedPhone;
            }

            await sendSMS(formattedPhone, `Payment successful! Your voucher code is: ${code}`);
        }

        res.sendStatus(200);
    } catch (err) {
        console.error("Webhook processing error:", err);
        res.sendStatus(500);
    }
});



module.exports = router;
