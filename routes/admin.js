const express = require('express');
const pool = require('../db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

router.get('/payments', authenticateToken, async (req, res) => {
    const result = await pool.query('SELECT * FROM payments ORDER BY created_at DESC');
    res.json(result.rows);
});

router.get('/vouchers', authenticateToken, async (req, res) => {
    const result = await pool.query('SELECT * FROM vouchers ORDER BY generated_at DESC');
    res.json(result.rows);
});

router.get('/logs', authenticateToken, async (req, res) => {
    const result = await pool.query('SELECT * FROM logs ORDER BY created_at DESC');
    res.json(result.rows);
});

router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const totalVouchers = await pool.query('SELECT COUNT(*) FROM vouchers');
        const usedVouchers = await pool.query('SELECT COUNT(*) FROM vouchers WHERE is_used = true');
        const totalPayments = await pool.query('SELECT COUNT(*) FROM payments');
        const totalRevenue = await pool.query(
            'SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = $1',
            ['succeeded']
        );


        res.json({
            totalVouchers: totalVouchers.rows[0].count,
            usedVouchers: usedVouchers.rows[0].count,
            totalPayments: totalPayments.rows[0].count,
            totalRevenue: totalRevenue.rows[0].coalesce
        });
    } catch (error) {
        console.error("Error in /stats route:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


module.exports = router;
