const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// PostgreSQL Database Connection
// Render will automatically provide process.env.DATABASE_URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize Database Tables on Startup
async function initDb() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                balance NUMERIC(12, 2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS processed_hashes (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id),
                tx_hash VARCHAR(255) UNIQUE NOT NULL,
                amount NUMERIC(12, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Database tables initialized successfully.");
    } catch (err) {
        console.error("Database initialization error:", err);
    }
}
initDb();

// --- API ROUTES ---

// Register User
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, balance',
            [username, email, hashedPassword]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ success: false, message: 'Email or username already exists!' });
        }
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

// Login User
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }

        res.json({ 
            success: true, 
            user: { id: user.id, username: user.username, email: user.email, balance: parseFloat(user.balance) } 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// Get User Profile & Balance
app.get('/api/user/:email', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, email, balance FROM users WHERE email = $1', [req.params.email]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Verify Deposit Hash ID & Credit Balance
app.post('/api/verify-deposit', async (req, res) => {
    const { email, txHash } = req.body;
    if (!txHash || !email) {
        return res.status(400).json({ success: false, message: 'Missing data.' });
    }

    try {
        // Check if hash was already used
        const checkHash = await pool.query('SELECT * FROM processed_hashes WHERE tx_hash = $1', [txHash]);
        if (checkHash.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'This transaction hash has already been processed.' });
        }

        // Get user ID
        const userRes = await pool.query('SELECT id, balance FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const user = userRes.rows[0];
        const depositAmount = 50.00; // Standard test credit amount per valid hash

        // Execute database transaction update
        await pool.query('BEGIN');
        await pool.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [depositAmount, user.id]);
        await pool.query('INSERT INTO processed_hashes (user_id, tx_hash, amount) VALUES ($1, $2, $3)', [user.id, txHash, depositAmount]);
        await pool.query('COMMIT');

        const updatedUser = await pool.query('SELECT id, username, email, balance FROM users WHERE id = $1', [user.id]);
        res.json({ success: true, message: `Successfully verified and credited $${depositAmount.toFixed(2)}!`, user: updatedUser.rows[0] });

    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ success: false, message: 'Server error processing transaction.' });
    }
});

// Admin stats endpoint
app.get('/api/admin/stats', async (req, res) => {
    try {
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        res.json({ success: true, totalUsers: parseInt(userCount.rows[0].count) });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
