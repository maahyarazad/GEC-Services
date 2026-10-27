import { useEffect, useState, useCallback, useRef } from "react";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import './HealthCheck.css';
import { MdRefresh, MdOpenInNew } from "react-icons/md";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

const REFRESH_INTERVAL = 60;

function friendlyName(url) {
    try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        const parts = host.split('.');
        const domain = parts.slice(0, -1).join(' ');
        return domain
            .split(/[\s-]/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    } catch {
        return url;
    }
}

function ServiceCard({ url, status, lastChecked }) {
    const isUp = status === 'up';
    return (
        <div className={`hc-card ${isUp ? 'hc-card--up' : 'hc-card--down'}`}>
            <div className="hc-card__header">
                <div className={`hc-card__dot ${isUp ? 'hc-card__dot--up' : 'hc-card__dot--down'}`} />
                <span className={`hc-card__badge ${isUp ? 'hc-card__badge--up' : 'hc-card__badge--down'}`}>
                    {isUp ? 'Operational' : 'Down'}
                </span>
                <Tooltip title={`Open ${url}`}>
                    <span
                        className="hc-card__open"
                        onClick={() => window.open(url, '_blank')}
                    >
                        <MdOpenInNew size={14} />
                    </span>
                </Tooltip>
            </div>

            <div className="hc-card__icon">
                {isUp
                    ? <FaCheckCircle size={36} className="hc-icon--up" />
                    : <FaTimesCircle size={36} className="hc-icon--down" />
                }
            </div>

            <Typography className="hc-card__name" title={url}>
                {friendlyName(url)}
            </Typography>

            <Typography className="hc-card__url" title={url}>
                {url.replace(/^https?:\/\//, '')}
            </Typography>

            <Typography className="hc-card__time">
                {lastChecked ? `Checked ${new Date(lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : '—'}
            </Typography>
        </div>
    );
}

function SiteHealthChecker() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
    const intervalRef = useRef(null);
    const countdownRef = useRef(null);

    const checkHealth = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/health-check`, {
                method: 'GET',
                credentials: 'include',
            });
            const data = await response.json();
            if (data) setResults(data);
        } catch (err) {
            console.error('Health check failed:', err);
        } finally {
            setLoading(false);
            setCountdown(REFRESH_INTERVAL);
        }
    }, []);

    useEffect(() => {
        checkHealth();
        intervalRef.current = window.setInterval(checkHealth, REFRESH_INTERVAL * 1000);
        countdownRef.current = window.setInterval(() => {
            setCountdown((c) => (c > 0 ? c - 1 : REFRESH_INTERVAL));
        }, 1000);
        return () => {
            clearInterval(intervalRef.current);
            clearInterval(countdownRef.current);
        };
    }, [checkHealth]);

    const upCount = results.filter((r) => r.status === 'up').length;
    const total = results.length;
    const allUp = upCount === total && total > 0;

    return (
        <Box sx={{ padding: 2 }}>

            {/* ── Header ── */}
            <div className="hc-header">
                <div className="hc-header__left">
                    <Typography className="hc-header__title">Website Health</Typography>
                    {!loading && total > 0 && (
                        <span className={`hc-header__badge ${allUp ? 'hc-header__badge--ok' : 'hc-header__badge--warn'}`}>
                            {allUp ? `All ${total} services operational` : `${upCount} / ${total} operational`}
                        </span>
                    )}
                </div>
                <div className="hc-header__right">
                    {!loading && (
                        <span className="hc-header__countdown">
                            Next refresh in {countdown}s
                        </span>
                    )}
                    <Tooltip title="Refresh now">
                        <IconButton onClick={checkHealth} size="small" disabled={loading}>
                            <MdRefresh size={20} className={loading ? 'hc-spin' : ''} />
                        </IconButton>
                    </Tooltip>
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ width: '100%', height: 'calc(100vh - 175px)', overflowY: 'auto' }}>
                {loading && results.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <div className="hc-grid">
                        {results.map(({ url, status, lastChecked }) => (
                            <ServiceCard key={url} url={url} status={status} lastChecked={lastChecked} />
                        ))}
                    </div>
                )}
            </div>
        </Box>
    );
}

export default SiteHealthChecker;
