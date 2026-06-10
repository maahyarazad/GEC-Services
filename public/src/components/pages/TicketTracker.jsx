import { useState } from 'react';
import {
    Box, Button, TextField, Typography, Paper, Container,
    CircularProgress, Chip, Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import GECLogo from '../../assets/background.webp';
import { executeRecaptcha } from '../utils/recaptcha';
import {
    GEC,
    pageWrapperSx,
    containerSx,
    paperSx,
    topAccentBarSx,
    bottomAccentBarSx,
    logoSx,
    titleSx,
    dividerSx,
    primaryBtnSx,
    fieldSx,
    footerLinkSx,
} from '../PartnerOnboarding/PartnerOnboardingStyles';

const SERVER_URL = import.meta.env.VITE_SERVERURL;

const STATUS_COLOR = {
    'Open': 'default',
    'In Progress': 'info',
    'Waiting for Customer': 'warning',
    'Resolved': 'success',
    'Closed': 'default',
};

const PRIORITY_COLOR = { Low: 'default', Medium: 'warning', High: 'error' };

function InfoRow({ label, value }) {
    return (
        <Box sx={{ display: 'flex', gap: 2, py: 1.25, borderBottom: `1px solid ${GEC.goldBorder}` }}>
            <Typography sx={{ minWidth: 160, fontWeight: 600, color: GEC.textSecondary, fontSize: 14 }}>
                {label}
            </Typography>
            <Box sx={{ fontSize: 14, color: GEC.textPrimary }}>{value}</Box>
        </Box>
    );
}
InfoRow.propTypes = { label: () => null, value: () => null };

export default function TicketTracker() {
    const [ticketNumber, setTicketNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [ticket, setTicket] = useState(null);
    const navigate = useNavigate();

    const handleTrack = async (e) => {
        e.preventDefault();
        if (!ticketNumber.trim()) return;
        setLoading(true);
        setError('');
        setTicket(null);

        let recaptchaToken;
        try {
            recaptchaToken = await executeRecaptcha('track_ticket');
        } catch {
            setError('Could not verify reCAPTCHA. Please try again.');
            setLoading(false);
            return;
        }

        try {
            const params = new URLSearchParams({ ticketNumber: ticketNumber.trim(), recaptchaToken });
            const res = await fetch(`${SERVER_URL}/support/ticket/track?${params.toString()}`, { method: 'GET' });
            const data = await res.json();
            if (!res.ok || !data.status) { setError(data.message ?? 'Failed to load ticket.'); return; }
            setTicket(data.data);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={pageWrapperSx}>
            <Container maxWidth="md" sx={containerSx}>
                <Paper elevation={0} sx={paperSx}>
                    <Box sx={topAccentBarSx} />

                    <Box sx={{ px: { xs: 3, sm: 5 }, pt: 4, pb: 5 }}>
                        <Box
                            component="img"
                            src={GECLogo}
                            alt="GEC Logo"
                            sx={{ ...logoSx, height: 80 }}
                        />

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                            {/* <ConfirmationNumberOutlinedIcon sx={{ fontSize: 28, color: GEC.goldDark }} /> */}
                            <Typography variant="h5" sx={titleSx}>
                                Track Your{' '}
                                <Box component="span" sx={{ color: GEC.goldDark }}>Ticket</Box>
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: GEC.textSecondary, mb: 4, lineHeight: 1.7 }}>
                            Enter your ticket number to check the current status of your support request.
                        </Typography>

                        <Box sx={dividerSx} />

                        <Box
                            component="form"
                            onSubmit={handleTrack}
                            sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, mb: 3 }}
                        >
                            <TextField
                                fullWidth
                                label="Ticket Number"
                                placeholder="SUP-20260608-000123"
                                value={ticketNumber}
                                onChange={(e) => { setTicketNumber(e.target.value.toUpperCase()); setError(''); setTicket(null); }}
                                inputProps={{ style: { fontFamily: 'monospace', letterSpacing: 1 } }}
                                sx={fieldSx}
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={loading || !ticketNumber.trim()}
                                sx={{ ...primaryBtnSx, minWidth: 120, whiteSpace: 'nowrap' }}
                                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                            >
                                {loading ? 'Looking up…' : 'Track Ticket'}
                            </Button>
                        </Box>

                        {error && (
                            <Box
                                sx={{
                                    mb: 3, p: 2, borderRadius: 2,
                                    background: '#fff5f5', border: '1px solid #fca5a5',
                                    color: '#b91c1c', fontSize: 14,
                                }}
                            >
                                {error}
                            </Box>
                        )}

                        {ticket && (
                            <Box
                                sx={{
                                    border: `1px solid ${GEC.goldBorder}`,
                                    borderRadius: 2.5,
                                    background: '#faf8f3',
                                    p: { xs: 2.5, sm: 3 },
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1,
                                    }}
                                >
                                    <Box>
                                        <Typography variant="caption" sx={{ color: GEC.textSecondary }}>
                                            Ticket Number
                                        </Typography>
                                        <Typography
                                            variant="h6"
                                            fontWeight={700}
                                            sx={{ color: GEC.goldDark, fontFamily: 'monospace' }}
                                        >
                                            {ticket.ticket_number}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={ticket.status}
                                        color={STATUS_COLOR[ticket.status] ?? 'default'}
                                        sx={{ fontWeight: 600 }}
                                    />
                                </Box>

                                <Divider sx={{ mb: 2, borderColor: GEC.goldBorder }} />

                                <InfoRow label="Subject" value={ticket.subject} />
                                <InfoRow label="Category" value={ticket.category} />
                                <InfoRow
                                    label="Priority"
                                    value={
                                        <Chip
                                            label={ticket.priority}
                                            color={PRIORITY_COLOR[ticket.priority] ?? 'default'}
                                            size="small"
                                        />
                                    }
                                />
                                <InfoRow label="Submitted" value={new Date(ticket.created_at).toLocaleString()} />
                                <InfoRow label="Last Updated" value={new Date(ticket.updated_at).toLocaleString()} />
                                {ticket.resolved_at && (
                                    <InfoRow label="Resolved" value={new Date(ticket.resolved_at).toLocaleString()} />
                                )}

                                {ticket.comments?.length > 0 && (
                                    <Box sx={{ mt: 3 }}>
                                        <Typography
                                            variant="subtitle1"
                                            fontWeight={700}
                                            gutterBottom
                                            sx={{ color: GEC.textPrimary }}
                                        >
                                            Support Responses
                                        </Typography>
                                        {ticket.comments.map((c, i) => (
                                            <Box
                                                key={i}
                                                sx={{
                                                    p: 2, mb: 1.5, borderRadius: 2,
                                                    background: GEC.goldMuted,
                                                    border: `1px solid ${GEC.goldBorder}`,
                                                }}
                                            >
                                                <Typography variant="body2" sx={{ color: GEC.textPrimary }}>
                                                    {c.comment}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{ color: GEC.textSecondary, mt: 0.5, display: 'block' }}
                                                >
                                                    {new Date(c.created_at).toLocaleString()}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        )}

                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: '#a89b7a' }}>
                            Need help?{' '}
                            <Box component="span" sx={footerLinkSx} onClick={() => navigate('/support')}>
                                Raise a Ticket
                            </Box>
                        </Typography>
                    </Box>

                    <Box sx={bottomAccentBarSx} />
                </Paper>
            </Container>
        </Box>
    );
}
