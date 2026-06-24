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

// Extract a leading timestamp from a log line and strip it from the text.
// Handles common PM2 / ISO formats, e.g.:
//   2025-05-30T09:55:38.123Z message
//   2025-05-30 09:55:38 +04:00: message
//   2025-05-30 09:55:38: message
//   [2025-05-30 09:55:38] message
// Returns { line, ts } where ts is epoch-ms, or null when no timestamp is present.
function parseLogLine(raw) {
    const m = raw.match(
        /^\[?\s*(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s*([+-]\d{2}:?\d{2}|Z)?\]?\s*[:\-]?\s*/
    );
    if (m) {
        const iso = `${m[1]}T${m[2]}${m[3] || ''}`;
        const ts = Date.parse(iso);
        if (!Number.isNaN(ts)) {
            return { line: raw.slice(m[0].length), ts };
        }
    }
    return { line: raw, ts: null };
}

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
        lines.forEach(raw => {
            const { line, ts } = parseLogLine(raw);
            // Fall back to arrival time for live lines that carry no embedded timestamp.
            send({ type: 'line', line, ts: ts ?? Date.now() });
        });
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
        // Return each line with its own parsed timestamp so the client renders
        // the real event time instead of the fetch time.
        const lines = allLines.slice(startIdx, endIdx).map(parseLogLine);

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
