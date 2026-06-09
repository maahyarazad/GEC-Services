import { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Chip, Divider, TextField, MenuItem,
    CircularProgress, Alert, IconButton, Paper, Stack, Switch, FormControlLabel,
    Avatar,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import Modal from '../../Modal';
import { useSnackbar } from '../../Providers/Snackbar';

const SERVER_URL = import.meta.env.VITE_SERVERURL;

const STATUS_OPTIONS   = ['Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed'];
const STATUS_COLOR     = { 'Open': 'default', 'In Progress': 'info', 'Waiting for Customer': 'warning', 'Resolved': 'success', 'Closed': 'default' };
const PRIORITY_COLOR   = { Low: 'default', Medium: 'warning', High: 'error' };

function Section({ title, children }) {
    return (
        <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11 }}>{title}</Typography>
            {children}
        </Box>
    );
}
Section.propTypes = { title: () => null, children: () => null };

function InfoRow({ label, children }) {
    return (
        <Box sx={{ display: 'flex', gap: 2, py: 0.75 }}>
            <Typography sx={{ minWidth: 120, fontWeight: 600, fontSize: 13, color: 'text.secondary', flexShrink: 0 }}>{label}</Typography>
            <Box sx={{ flex: 1, fontSize: 13 }}>{children}</Box>
        </Box>
    );
}
InfoRow.propTypes = { label: () => null, children: () => null };

function adminDisplayName(a) {
    if (!a) return null;
    const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
    return name || a.email;
}

// eslint-disable-next-line react/prop-types
export default function TicketDetailModal({ ticketId, onClose }) {
    const { showSnackbar } = useSnackbar();
    const [ticket, setTicket]         = useState(null);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState('');
    const [status, setStatus]         = useState('');
    const [saving, setSaving]         = useState(false);
    const [comment, setComment]       = useState('');
    const [isPublic, setIsPublic]     = useState(false);
    const [posting, setPosting]       = useState(false);
    const [admins, setAdmins]         = useState([]);
    const [assignTo, setAssignTo]     = useState('');
    const [assigning, setAssigning]   = useState(false);

    const fetchTicket = async () => {
        setLoading(true);
        setError('');
        try {
            const res  = await fetch(`${SERVER_URL}/api/admin/support/tickets/${ticketId}`, { credentials: 'include' });
            const data = await res.json();
            if (!res.ok || !data.status) { setError(data.message ?? 'Failed to load.'); return; }
            setTicket(data.data);
            setStatus(data.data.status);
            setAssignTo(data.data.assigned_to ?? '');
        } catch {
            setError('Network error.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAdmins = async () => {
        try {
            const res  = await fetch(`${SERVER_URL}/api/admin/support/admins`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok && data.status) setAdmins(data.data);
        } catch { /* non-critical */ }
    };

    useEffect(() => {
        fetchTicket();
        fetchAdmins();
    }, [ticketId]); // eslint-disable-line react-hooks/exhaustive-deps

    const saveStatus = async () => {
        if (status === ticket?.status) return;
        setSaving(true);
        try {
            const res  = await fetch(`${SERVER_URL}/api/admin/support/tickets/${ticketId}/status`, {
                method: 'PATCH', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (!res.ok || !data.status) { showSnackbar(data.message ?? 'Failed.', 'error'); return; }
            showSnackbar('Status updated.', 'success');
            fetchTicket();
        } catch {
            showSnackbar('Network error.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const saveAssign = async () => {
        setAssigning(true);
        try {
            const res  = await fetch(`${SERVER_URL}/api/admin/support/tickets/${ticketId}/assign`, {
                method: 'PATCH', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_id: assignTo || null }),
            });
            const data = await res.json();
            if (!res.ok || !data.status) { showSnackbar(data.message ?? 'Failed.', 'error'); return; }
            showSnackbar('Ticket assigned.', 'success');
            fetchTicket();
        } catch {
            showSnackbar('Network error.', 'error');
        } finally {
            setAssigning(false);
        }
    };

    const addComment = async () => {
        if (!comment.trim()) return;
        setPosting(true);
        try {
            const res  = await fetch(`${SERVER_URL}/api/admin/support/tickets/${ticketId}/comment`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment, is_public: isPublic }),
            });
            const data = await res.json();
            if (!res.ok || !data.status) { showSnackbar(data.message ?? 'Failed.', 'error'); return; }
            showSnackbar('Comment added.', 'success');
            setComment('');
            fetchTicket();
        } catch {
            showSnackbar('Network error.', 'error');
        } finally {
            setPosting(false);
        }
    };

    const downloadAttachment = (id, name) => {
        const a = document.createElement('a');
        a.href = `${SERVER_URL}/api/admin/support/attachments/${id}`;
        a.download = name;
        a.click();
    };

    const assignChanged = String(assignTo) !== String(ticket?.assigned_to ?? '');

    return (
        <Modal
            isOpen
            onRequestClose={onClose}
            title={ticket ? `${ticket.ticket_number} — ${ticket.subject}` : 'Loading…'}
        >
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : ticket ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                    {/* Ticket info */}
                    <Section title="Ticket Information">
                        <InfoRow label="Customer">
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{ticket.full_name}</Typography>
                                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{ticket.email}</Typography>
                            </Box>
                        </InfoRow>
                        <InfoRow label="Category">{ticket.category}</InfoRow>
                        <InfoRow label="Priority"><Chip label={ticket.priority} color={PRIORITY_COLOR[ticket.priority] ?? 'default'} size="small" /></InfoRow>
                        <InfoRow label="Status"><Chip label={ticket.status} color={STATUS_COLOR[ticket.status] ?? 'default'} size="small" /></InfoRow>
                        <InfoRow label="Created">{new Date(ticket.created_at).toLocaleString()}</InfoRow>
                        <InfoRow label="Updated">{new Date(ticket.updated_at).toLocaleString()}</InfoRow>
                        {ticket.resolved_at && <InfoRow label="Resolved">{new Date(ticket.resolved_at).toLocaleString()}</InfoRow>}
                        <InfoRow label="Assigned To">
                            {ticket.assigned_to ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: 'primary.main' }}>
                                        {(ticket.assigned_firstName?.[0] ?? ticket.assigned_email?.[0] ?? '?').toUpperCase()}
                                    </Avatar>
                                    <Typography sx={{ fontSize: 13 }}>
                                        {adminDisplayName({ firstName: ticket.assigned_firstName, lastName: ticket.assigned_lastName, email: ticket.assigned_email })}
                                    </Typography>
                                </Box>
                            ) : (
                                <Typography sx={{ fontSize: 13, color: 'text.secondary', fontStyle: 'italic' }}>Unassigned</Typography>
                            )}
                        </InfoRow>
                    </Section>

                    <Divider sx={{ mb: 2 }} />

                    <Section title="Description">
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, whiteSpace: 'pre-wrap', fontSize: 14 }}>
                            {ticket.description}
                        </Paper>
                    </Section>

                    {/* Attachments */}
                    {ticket.attachments?.length > 0 && (
                        <>
                            <Divider sx={{ mb: 2 }} />
                            <Section title={`Attachments (${ticket.attachments.length})`}>
                                <Stack spacing={1}>
                                    {ticket.attachments.map((a) => (
                                        <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>{a.original_name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{a.mime_type} · {(a.file_size / 1024).toFixed(1)} KB</Typography>
                                            </Box>
                                            <IconButton size="small" onClick={() => downloadAttachment(a.id, a.original_name)}>
                                                <DownloadIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Stack>
                            </Section>
                        </>
                    )}

                    <Divider sx={{ mb: 2 }} />

                    {/* Change status */}
                    <Section title="Change Status">
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                            <TextField
                                select size="small" value={status} onChange={(e) => setStatus(e.target.value)}
                                sx={{ minWidth: 200 }}
                            >
                                {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </TextField>
                            <Button
                                variant="contained" size="small"
                                disabled={saving || status === ticket.status}
                                onClick={saveStatus}
                                sx={{ textTransform: 'none' }}
                                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
                            >
                                Save Status
                            </Button>
                        </Box>
                    </Section>

                    <Divider sx={{ mb: 2 }} />

                    {/* Assign ticket */}
                    <Section title="Assign Ticket">
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                            <TextField
                                select size="small" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}
                                sx={{ minWidth: 220 }}
                                slotProps={{ input: { startAdornment: !assignTo ? <PersonOutlineIcon fontSize="small" sx={{ mr: 1, color: 'text.disabled' }} /> : null } }}
                            >
                                <MenuItem value=""><em>Unassigned</em></MenuItem>
                                {admins.map((a) => (
                                    <MenuItem key={a.id} value={a.id}>
                                        {adminDisplayName(a)}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <Button
                                variant="contained" size="small"
                                disabled={assigning || !assignChanged}
                                onClick={saveAssign}
                                sx={{ textTransform: 'none' }}
                                startIcon={assigning ? <CircularProgress size={14} color="inherit" /> : null}
                            >
                                Save Assignment
                            </Button>
                        </Box>
                    </Section>

                    <Divider sx={{ mb: 2 }} />

                    {/* Activity timeline */}
                    {ticket.activity?.length > 0 && (
                        <>
                            <Section title="Activity Timeline">
                                <Stack spacing={0.5}>
                                    {ticket.activity.map((a, i) => (
                                        <Box key={i} sx={{ display: 'flex', gap: 2, py: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 130, flexShrink: 0 }}>
                                                {new Date(a.created_at).toLocaleString()}
                                            </Typography>
                                            <Typography variant="caption">
                                                {a.action}{a.old_value && a.new_value ? `: ${a.old_value} → ${a.new_value}` : ''}
                                                {(a.admin_firstName || a.admin_lastName) && (
                                                    <Typography component="span" variant="caption" color="text.secondary">
                                                        {' '}by {[a.admin_firstName, a.admin_lastName].filter(Boolean).join(' ')}
                                                    </Typography>
                                                )}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </Section>
                            <Divider sx={{ mb: 2 }} />
                        </>
                    )}

                    {/* Comments */}
                    {ticket.comments?.length > 0 && (
                        <>
                            <Section title="Comments">
                                <Stack spacing={1.5}>
                                    {ticket.comments.map((c, i) => (
                                        <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: c.is_public ? '#f0f7ff' : '#fff8e1' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Chip label={c.is_public ? 'Public' : 'Internal'} size="small" color={c.is_public ? 'info' : 'default'} />
                                                    {(c.admin_firstName || c.admin_lastName) && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {[c.admin_firstName, c.admin_lastName].filter(Boolean).join(' ')}
                                                        </Typography>
                                                    )}
                                                </Box>
                                                <Typography variant="caption" color="text.secondary">{new Date(c.created_at).toLocaleString()}</Typography>
                                            </Box>
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.comment}</Typography>
                                        </Paper>
                                    ))}
                                </Stack>
                            </Section>
                            <Divider sx={{ mb: 2 }} />
                        </>
                    )}

                    {/* Add comment */}
                    <Section title="Add Comment">
                        <TextField
                            multiline rows={3} fullWidth size="small"
                            placeholder="Write a note or response…"
                            value={comment} onChange={(e) => setComment(e.target.value)}
                            sx={{ mb: 1.5 }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                            <FormControlLabel
                                control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} size="small" />}
                                label={<Typography variant="body2">{isPublic ? 'Public (visible to customer)' : 'Internal note (admin only)'}</Typography>}
                            />
                            <Button
                                variant="contained" size="small"
                                disabled={posting || !comment.trim()}
                                onClick={addComment}
                                sx={{ textTransform: 'none' }}
                                startIcon={posting ? <CircularProgress size={14} color="inherit" /> : null}
                            >
                                Add Comment
                            </Button>
                        </Box>
                    </Section>
                </Box>
            ) : null}
        </Modal>
    );
}
