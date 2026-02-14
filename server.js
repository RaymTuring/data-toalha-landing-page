const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 18791;
const DB_PATH = path.join(__dirname, 'data_toalha.db');

app.use(cors());
app.use(bodyParser.json());

// Initialize Database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error('Error opening database', err);
    console.log('Connected to Data Toalha SQLite database.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        telephone TEXT,
        city TEXT,
        interest TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// API Endpoints
app.get('/api/metrics', (req, res) => {
    res.json({
        activeUsers: 1452,
        tokens24h: 12500000,
        status: 'OPERATIONAL',
        version: '1.0.4-BETA',
        latency: 42,
        timestamp: new Date().toISOString()
    });
});

app.post('/api/contact', (req, res) => {
    const { name, email, telephone, city, interest } = req.body;
    const stmt = db.prepare(`INSERT INTO contacts (name, email, telephone, city, interest) VALUES (?, ?, ?, ?, ?)`);
    stmt.run([name, email, telephone, city, interest], function(err) {
        if (err) {
            console.error('Insert error', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ id: this.lastID, status: 'success' });
    });
    stmt.finalize();
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Data Toalha Backend running on http://0.0.0.0:${PORT}`);
});
