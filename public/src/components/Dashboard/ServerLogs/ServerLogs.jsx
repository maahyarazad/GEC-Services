import { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, TextField, IconButton, Chip, Tooltip, Paper, InputAdornment, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { MdPlayArrow, MdPause, MdDeleteSweep } from 'react-icons/md';
import { IoSearchOutline } from 'react-icons/io5';

const MAX_LINES = 1000;
const RECONNECT_DELAY_MS = 3000;

const LEVEL = {
    error: { color: '#ff6b6b', label: 'ERR' },
    warn:  { color: '#ffa94d', label: 'WRN' },
    info:  { color: '#74c0fc', label: 'INF' },
    debug: { color: '#868e96', label: 'DBG' },
};

function detectLevel(line) {
    const l = line.toLowerCase();
    if (/\b(error|err|exception|fatal|critical)\b/.test(l)) return 'error';
    if (/\b(warn|warning)\b/.test(l)) return 'warn';
    if (/\b(debug|verbose|trace)\b/.test(l)) return 'debug';
    return 'info';
}

export default function ServerLogs() {
    const [logType, setLogType] = useState('out');
    const [lines, setLines] = useState([]);
    const [filter, setFilter] = useState('');
    const [paused, setPaused] = useState(false);
    const [connected, setConnected] = useState(false);
    const [statusMsg, setStatusMsg] = useState('Connecting…');

    const esRef = useRef(null);
    const pausedRef = useRef(false);
    const logBoxRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    // Keep a stable ref to logType so the reconnect callback always reads the latest value
    const logTypeRef = useRef(logType);

    const appendLines = useCallback((incoming) => {
        if (pausedRef.current) return;
        setLines(prev => {
            const next = [...prev, ...incoming];
            return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
        });
    }, []);

    const connect = useCallback(() => {
        clearTimeout(reconnectTimerRef.current);
        if (esRef.current) { esRef.current.close(); esRef.current = null; }

        const url = `${import.meta.env.VITE_SERVERURL}/api/logs/stream?type=${logTypeRef.current}`;
        const es = new EventSource(url, { withCredentials: true });
        esRef.current = es;

        es.onopen = () => { setConnected(true); setStatusMsg(''); };

        es.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.type === 'line') {
                    appendLines([{ line: msg.line, level: detectLevel(msg.line), ts: msg.ts }]);
                }
                if (msg.type === 'status') setStatusMsg(msg.message);
                if (msg.type === 'error') {
                    appendLines([{ line: `[ERROR] ${msg.message}`, level: 'error', ts: Date.now() }]);
                }
            } catch (_) {}
        };

        es.onerror = () => {
            setConnected(false);
            setStatusMsg(`Disconnected — reconnecting in ${RECONNECT_DELAY_MS / 1000}s…`);
            es.close();
            reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
        };
    }, [appendLines]);

// Connect on mount — cleanup closes stream when component unmounts (route change)
useEffect(() => {
    connect();
    return () => {
        // Explicitly close the EventSource and cancel any pending reconnect
        if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
        }
        clearTimeout(reconnectTimerRef.current);
    };
}, []); // ← empty array: run once on mount, clean up on unmount

    // Reconnect when log type changes
    const handleTypeChange = (_e, val) => {
        if (!val || val === logType) return;
        logTypeRef.current = val;
        setLogType(val);
        setLines([]);
        setConnected(false);
        setStatusMsg('Connecting…');
        connect();
    };

    // Auto-scroll to bottom when not paused
    useEffect(() => {
        if (!paused && logBoxRef.current) {
            logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
        }
    }, [lines, paused]);

    const togglePause = () => {
        pausedRef.current = !pausedRef.current;
        setPaused(p => !p);
    };

    const filtered = filter.trim()
        ? lines.filter(({ line }) => line.toLowerCase().includes(filter.toLowerCase()))
        : lines;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', p: { xs: 1, md: 2 } }}>
            {/* Toolbar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                {/* Log type toggle */}
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={logType}
                    onChange={handleTypeChange}
                    aria-label="log type"
                >
                    <ToggleButton value="out" sx={{ textTransform: 'none', px: 1.5, fontSize: 12 }}>
                        Output
                    </ToggleButton>
                    <ToggleButton value="error" sx={{ textTransform: 'none', px: 1.5, fontSize: 12, '&.Mui-selected': { color: 'error.main', borderColor: 'error.light' } }}>
                        Error
                    </ToggleButton>
                </ToggleButtonGroup>

                <Chip
                    size="small"
                    label={connected ? 'Live' : 'Reconnecting…'}
                    color={connected ? 'success' : 'warning'}
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                />

                <Tooltip title={paused ? 'Resume streaming' : 'Pause streaming'}>
                    <IconButton size="small" onClick={togglePause} color={paused ? 'warning' : 'default'}>
                        {paused ? <MdPlayArrow size={20} /> : <MdPause size={20} />}
                    </IconButton>
                </Tooltip>

                <Tooltip title="Clear buffer">
                    <IconButton size="small" onClick={() => setLines([])}>
                        <MdDeleteSweep size={20} />
                    </IconButton>
                </Tooltip>

                <TextField
                    size="small"
                    placeholder="Filter logs…"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    sx={{ flex: 1, minWidth: 180, maxWidth: 420 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IoSearchOutline size={16} />
                                </InputAdornment>
                            ),
                        }
                    }}
                />

                <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary', flexShrink: 0 }}>
                    {filtered.length} / {MAX_LINES} lines
                </Typography>
            </Box>

            {statusMsg && (
                <Typography variant="caption" sx={{ mb: 0.5, color: connected ? 'text.secondary' : 'warning.main' }}>
                    {statusMsg}
                </Typography>
            )}

            {/* Log Output */}
            <Paper
                ref={logBoxRef}
                variant="outlined"
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    bgcolor: '#0d1117',
                    border: '1px solid #30363d',
                    borderRadius: 1,
                    p: 1,
                }}
            >
                {filtered.length === 0 && (
                    <Typography sx={{ color: '#555', fontFamily: 'monospace', fontSize: 12, mt: 1 }}>
                        {connected ? 'Waiting for log lines…' : 'Connecting to server…'}
                    </Typography>
                )}

                {filtered.map(({ line, level, ts }, i) => {
                    const { color, label } = LEVEL[level] || LEVEL.info;
                    return (
                        <Box
                            key={i}
                            sx={{
                                display: 'flex',
                                gap: 1,
                                py: '2px',
                                px: '4px',
                                borderRadius: '3px',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                            }}
                        >
                            <Typography
                                component="span"
                                sx={{ color: '#484f58', fontFamily: 'monospace', fontSize: 11, flexShrink: 0, userSelect: 'none', minWidth: 72 }}
                            >
                                {new Date(ts).toLocaleTimeString()}
                            </Typography>

                            <Typography
                                component="span"
                                sx={{ color, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, flexShrink: 0, minWidth: 28, userSelect: 'none' }}
                            >
                                {label}
                            </Typography>

                            <Typography
                                component="span"
                                sx={{ color: '#c9d1d9', fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}
                            >
                                {line}
                            </Typography>
                        </Box>
                    );
                })}

                <div />
            </Paper>
        </Box>
    );
}
