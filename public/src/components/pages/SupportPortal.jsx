import { useState, useRef } from 'react';
import {
    Box, Button, TextField, MenuItem, Typography, Paper, Container,
    LinearProgress, Chip, CircularProgress,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useNavigate } from 'react-router-dom';
import GECLogo from '../../assets/background.webp';
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
    secondaryBtnSx,
    fieldSx,
    footerLinkSx,
} from '../PartnerOnboarding/PartnerOnboardingStyles';

const SERVER_URL = import.meta.env.VITE_SERVERURL;

const CATEGORIES = ['Bug Report', 'Technical Issue', 'Feature Request', 'Account Issue', 'General Inquiry'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const MAX_FILES = 3;
const MAX_FILE_SIZE = 1 * 1024 * 1024;
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.pdf', '.docx', '.txt'];

const initialForm = { full_name: '', email: '', subject: '', category: '', priority: '', description: '' };

export default function SupportPortal() {
    const [form, setForm] = useState(initialForm);
    const [files, setFiles] = useState([]);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(null);
    const [serverError, setServerError] = useState('');
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const validate = () => {
        const e = {};
        if (!form.full_name.trim()) e.full_name = 'Required';
        if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
        if (!form.subject.trim()) e.subject = 'Required';
        if (!form.category) e.category = 'Required';
        if (!form.priority) e.priority = 'Required';
        if (!form.description.trim()) e.description = 'Required';
        return e;
    };

    const handleChange = (e) => {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
        setErrors((er) => ({ ...er, [e.target.name]: undefined }));
    };

    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files ?? []);
        const merged = [...files];
        const fileErrors = [];

        for (const f of selected) {
            if (merged.length >= MAX_FILES) { fileErrors.push(`Max ${MAX_FILES} files allowed`); break; }
            const ext = '.' + f.name.split('.').pop().toLowerCase();
            if (!ALLOWED_EXT.includes(ext)) { fileErrors.push(`"${f.name}" type not allowed`); continue; }
            if (f.size > MAX_FILE_SIZE) { fileErrors.push(`"${f.name}" exceeds 1 MB`); continue; }
            merged.push(f);
        }

        setFiles(merged);
        if (fileErrors.length) setErrors((er) => ({ ...er, files: fileErrors.join(' · ') }));
        else setErrors((er) => ({ ...er, files: undefined }));
        e.target.value = '';
    };

    const removeFile = (index) => setFiles((f) => f.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();
        const e2 = validate();
        if (Object.keys(e2).length) { setErrors(e2); return; }

        setSubmitting(true);
        setServerError('');

        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        files.forEach((f) => fd.append('attachments', f));

        try {
            const res = await fetch(`${SERVER_URL}/api/support/ticket`, { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok || !data.status) { setServerError(data.message ?? 'Submission failed.'); return; }
            setSubmitted(data.ticket_number);
        } catch {
            setServerError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
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

                            <Box
                                sx={{
                                    width: 72, height: 72, borderRadius: '50%',
                                    background: GEC.goldMuted, border: `2px solid ${GEC.gold}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    mx: 'auto', mb: 2,
                                }}
                            >
                                <CheckCircleOutlineIcon sx={{ fontSize: 38, color: GEC.goldDark }} />
                            </Box>

                            <Typography variant="h5" sx={{ ...titleSx, textAlign: 'center', mb: 1 }}>
                                Ticket{' '}
                                <Box component="span" sx={{ color: GEC.goldDark }}>Submitted</Box>
                            </Typography>
                            <Typography variant="body2" sx={{ color: GEC.textSecondary, lineHeight: 1.7, mb: 3, textAlign: 'center' }}>
                                Your support request has been received. A confirmation has been sent to your email.
                            </Typography>

                            <Box
                                sx={{
                                    border: `1px solid ${GEC.goldBorder}`, borderRadius: 2,
                                    p: 2.5, mb: 3, background: GEC.goldMuted, textAlign: 'center',
                                }}
                            >
                                <Typography variant="caption" sx={{ color: GEC.textSecondary, display: 'block', mb: 0.5 }}>
                                    Ticket Number
                                </Typography>
                                <Typography
                                    variant="h6"
                                    fontWeight={700}
                                    sx={{ color: GEC.goldDark, fontFamily: 'monospace', letterSpacing: 1 }}
                                >
                                    {submitted}
                                </Typography>
                            </Box>

                            <Typography variant="body2" sx={{ color: GEC.textSecondary, textAlign: 'center', mb: 4 }}>
                                Use this number to track your ticket status.
                            </Typography>

                            <Box sx={dividerSx} />

                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => navigate('/support/track')}
                                    sx={secondaryBtnSx}
                                >
                                    Track Ticket
                                </Button>
                                <Button
                                    variant="contained"
                                    sx={primaryBtnSx}
                                    onClick={() => { setSubmitted(null); setForm(initialForm); setFiles([]); }}
                                >
                                    Submit Another Ticket
                                </Button>
                            </Box>
                        </Box>

                        <Box sx={bottomAccentBarSx} />
                    </Paper>
                </Container>
            </Box>
        );
    }

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

                        <Typography variant="h5" sx={{ ...titleSx, mb: 0.5 }}>
                            Support{' '}
                            <Box component="span" sx={{ color: GEC.goldDark }}>Portal</Box>
                        </Typography>
                        <Typography variant="body2" sx={{ color: GEC.textSecondary, mb: 4, lineHeight: 1.7 }}>
                            Describe your issue and our team will get back to you as soon as possible.
                        </Typography>

                        <Box sx={dividerSx} />

                        {serverError && (
                            <Box
                                sx={{
                                    mb: 3, p: 2, borderRadius: 2,
                                    background: '#fff5f5', border: '1px solid #fca5a5',
                                    color: '#b91c1c', fontSize: 14,
                                }}
                            >
                                {serverError}
                            </Box>
                        )}

                        <Box
                            component="form"
                            onSubmit={handleSubmit}
                            noValidate
                            sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}
                        >
                            <TextField
                                label="Full Name" name="full_name" required
                                value={form.full_name} onChange={handleChange}
                                error={!!errors.full_name} helperText={errors.full_name}
                                sx={fieldSx}
                            />
                            <TextField
                                label="Email Address" name="email" type="email" required
                                value={form.email} onChange={handleChange}
                                error={!!errors.email} helperText={errors.email}
                                sx={fieldSx}
                            />
                            <TextField
                                label="Subject" name="subject" required
                                value={form.subject} onChange={handleChange}
                                error={!!errors.subject} helperText={errors.subject}
                                sx={{ gridColumn: { sm: '1 / -1' }, ...fieldSx }}
                            />
                            <TextField
                                select label="Category" name="category" required
                                value={form.category} onChange={handleChange}
                                error={!!errors.category} helperText={errors.category}
                                sx={fieldSx}
                            >
                                {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </TextField>
                            <TextField
                                select label="Priority" name="priority" required
                                value={form.priority} onChange={handleChange}
                                error={!!errors.priority} helperText={errors.priority}
                                sx={fieldSx}
                            >
                                {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                            </TextField>
                            <TextField
                                label="Description" name="description" required multiline rows={5}
                                value={form.description} onChange={handleChange}
                                error={!!errors.description} helperText={errors.description}
                                sx={{ gridColumn: { sm: '1 / -1' }, ...fieldSx }}
                            />

                            <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                                <Typography variant="body2" sx={{ color: GEC.textSecondary, mb: 1 }}>
                                    Attachments (optional) — up to {MAX_FILES} files, max 1 MB each · JPG, PNG, PDF, DOCX, TXT
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {files.map((f, i) => (
                                        <Chip
                                            key={i}
                                            label={f.name}
                                            onDelete={() => removeFile(i)}
                                            deleteIcon={<CloseIcon />}
                                            size="small"
                                            sx={{ maxWidth: 220, borderColor: GEC.goldBorder }}
                                        />
                                    ))}
                                    {files.length < MAX_FILES && (
                                        <Chip
                                            icon={<AttachFileIcon />}
                                            label="Add file"
                                            onClick={() => fileInputRef.current?.click()}
                                            variant="outlined"
                                            size="small"
                                            clickable
                                            sx={{
                                                borderColor: GEC.goldBorder,
                                                color: GEC.textSecondary,
                                                '&:hover': { borderColor: GEC.gold, color: GEC.goldDark },
                                            }}
                                        />
                                    )}
                                </Box>
                                {errors.files && (
                                    <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5, display: 'block' }}>
                                        {errors.files}
                                    </Typography>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    hidden
                                    accept=".jpg,.jpeg,.png,.pdf,.docx,.txt"
                                    onChange={handleFileChange}
                                />
                            </Box>

                            {submitting && (
                                <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                                    <LinearProgress
                                        sx={{
                                            borderRadius: 1,
                                            background: GEC.goldMuted,
                                            '& .MuiLinearProgress-bar': { background: GEC.gold },
                                        }}
                                    />
                                </Box>
                            )}

                            <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                                <Box sx={dividerSx} />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    disabled={submitting}
                                    sx={{ ...primaryBtnSx, minWidth: 160 }}
                                    startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
                                >
                                    {submitting ? 'Submitting…' : 'Submit Ticket'}
                                </Button>
                            </Box>
                        </Box>

                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: '#a89b7a' }}>
                            Already submitted a ticket?{' '}
                            <Box component="span" sx={footerLinkSx} onClick={() => navigate('/support/track')}>
                                Track your ticket
                            </Box>
                        </Typography>
                    </Box>

                    <Box sx={bottomAccentBarSx} />
                </Paper>
            </Container>
        </Box>
    );
}
