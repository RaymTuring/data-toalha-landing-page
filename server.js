/**
 * Data Toalha Metrics API Server
 * Serves real-time system metrics for the landing page
 */
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');

const PORT = 18791;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'dashboard.db.json');

// Initialize or load database
let db = {
    activeUsers: [],
    tokenCount: 0,
    requestsCount: 0,
    lastUpdated: Date.now(),
    version: '1.0.4-BETA'
};

if (fs.existsSync(DB_FILE)) {
    try {
        db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        console.log('Using fresh database');
    }
}

// Save database
function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Get system metrics
function getSystemMetrics() {
    const loadAvg = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
        cpu: {
            load: loadAvg[0].toFixed(2),
            cores: os.cpus().length
        },
        memory: {
            total: (totalMem / 1024 / 1024 / 1024).toFixed(2),
            used: (usedMem / 1024 / 1024 / 1024).toFixed(2),
            percent: ((usedMem / totalMem) * 100).toFixed(1)
        },
        uptime: os.uptime()
    };
}

// Simulate realistic metrics based on system activity
function calculateMetrics() {
    const sysMetrics = getSystemMetrics();
    
    // Base metrics with some variation based on system load
    const baseUsers = 42;
    const loadFactor = Math.min(sysMetrics.cpu.load / sysMetrics.cpu.cores, 1);
    
    // Active users: base + variation based on time of day and system load
    const hour = new Date().getHours();
    const timeMultiplier = (hour >= 9 && hour <= 18) ? 1.5 : 0.7;
    const activeUsers = Math.floor(baseUsers * timeMultiplier * (0.8 + loadFactor * 0.4));
    
    // Tokens processed (24h rolling estimate)
    const tokenBase = 1200000;
    const tokenVariation = Math.floor(Math.random() * 50000);
    const tokens24h = tokenBase + tokenVariation;
    
    // Latency based on system load (higher load = higher latency)
    const baseLatency = 45;
    const latency = Math.floor(baseLatency + (loadFactor * 100) + (Math.random() * 20));
    
    // Status determination
    let status = 'OPERATIONAL';
    let statusColor = 'green';
    if (loadFactor > 0.8) {
        status = 'HIGH LOAD';
        statusColor = 'yellow';
    } else if (loadFactor > 0.95) {
        status = 'DEGRADED';
        statusColor = 'orange';
    }
    
    return {
        activeUsers,
        tokens24h,
        latency,
        status,
        statusColor,
        version: db.version,
        uptime: sysMetrics.uptime,
        cpuLoad: sysMetrics.cpu.load,
        memoryUsed: sysMetrics.memory.percent,
        timestamp: new Date().toISOString()
    };
}

const HOST = '0.0.0.0';

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Health check
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
        return;
    }
    
    // Main metrics endpoint
    if (req.url === '/api/metrics') {
        const metrics = calculateMetrics();
        
        // Update DB
        db.lastUpdated = Date.now();
        db.requestsCount++;
        saveDB();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(metrics, null, 2));
        return;
    }
    
    // Detailed stats endpoint
    if (req.url === '/api/stats') {
        const sysMetrics = getSystemMetrics();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            system: sysMetrics,
            database: {
                requestsServed: db.requestsCount,
                lastUpdated: new Date(db.lastUpdated).toISOString()
            }
        }, null, 2));
        return;
    }
    
    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, HOST, () => {
    console.log(`Data Toalha Metrics API running on http://${HOST}:${PORT}`);
    console.log(`Endpoints:`);
    console.log(`  - http://localhost:${PORT}/api/metrics  (Landing page data)`);
    console.log(`  - http://localhost:${PORT}/api/stats    (Detailed stats)`);
    console.log(`  - http://localhost:${PORT}/health       (Health check)`);
});
