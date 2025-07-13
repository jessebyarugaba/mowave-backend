const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const voucherRoutes = require('./routes/voucher');
const smsRoutes = require('./routes/sms');
const adminRoutes = require('./routes/admin');


const app = express();
app.use(express.json());
// app.use(cors());

app.use(cors({
    origin: '*', // 👈 Allow all origins (or replace with your frontend URL to restrict)
}));

app.use('/auth', authRoutes);
app.use('/voucher', voucherRoutes);
app.use('/sms', smsRoutes);
app.use('/admin', adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
