const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

// Two directories above server.js → ~/logs/
const LOG_DIR = process.env.LOG_DIR || path.resolve(__dirname, '../../../logs');

const LOG_FILES = {
    out:   path.join(LOG_DIR, 'node-services.german-emirates-club.com.out'),
    error: path.join(LOG_DIR, 'node-services.german-emirates-club.com.error'),
};

router.get('/api/logs/stream', (req, res) => {
    const type = req.query.type === 'error' ? 'error' : 'out';
    const logFile = LOG_FILES[type];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    const tail = spawn('tail', ['-n', '50', '-f', logFile]);

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

module.exports = router;
