const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Two directories above server.js → ~/logs/
const LOG_DIR = process.env.LOG_DIR || path.resolve(__dirname, '../../../logs');

const LOG_FILES = {
    out:   path.join(LOG_DIR, 'node-services.german-emirates-club.com.out'),
    error: path.join(LOG_DIR, 'node-services.german-emirates-club.com.error'),
};

// SSE stream — live new lines only (tail -n 0 -f)
// Initial history is loaded separately via /api/logs/history
router.get('/api/logs/stream', (req, res) => {
    const type = req.query.type === 'error' ? 'error' : 'out';
    const logFile = LOG_FILES[type];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Maahyar CM: this header is useful when using Nginx Web Server
    // res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    const tail = spawn('tail', ['-n', '0', '-f', logFile]);

    tail.stdout.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(l => l.trim().length > 0);
        lines.forEach(line => send({ type: 'line', line, ts: Date.now() }));
    });

    tail.stderr.on('data', (chunk) => {
        send({ type: 'error', message: chunk.toString().trim() });
    });

    tail.on('error', (err) => {
        send({ type: 'error', message: err.message });
        res.end();
    });

    tail.on('close', () => res.end());

    req.on('close', () => {
        tail.kill();
    });
});

// Paginated history — page 1 = most recent lines, page 2 = next older block, etc.
router.get('/api/logs/history', (req, res) => {
    const type = req.query.type === 'error' ? 'error' : 'out';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(500, Math.max(50, parseInt(req.query.pageSize) || 200));
    const logFile = LOG_FILES[type];

    try {
        const content = fs.readFileSync(logFile, 'utf8');
        const allLines = content.split('\n').filter(l => l.trim().length > 0);
        const total = allLines.length;

        // page 1 → last pageSize lines; page 2 → the block before that; etc.
        const endIdx = total - (page - 1) * pageSize;
        const startIdx = Math.max(0, endIdx - pageSize);
        const lines = allLines.slice(startIdx, endIdx);

        return res.json({
            status: true,
            lines,
            page,
            pageSize,
            total,
            hasMore: startIdx > 0,
        });
    } catch (err) {
        return res.status(500).json({ status: false, message: err.message });
    }
});

module.exports = router;
