import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import { SiAutoprefixer } from 'react-icons/si';
import { MdAdd, MdClose } from 'react-icons/md';
import { useSnackbar } from '../../Providers/Snackbar';

const slugify = (val) =>
    val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const LANGUAGES = [
    { value: 'en', label: 'English (en)' },
    { value: 'de', label: 'German (de)' }
];

const DEFAULT_BUTTONS = [
    { title: 'Teilnehmen', id: 'ATTEND' },
    { title: 'Nicht teilnehmen', id: 'NOT_ATTEND' },
];

export default function CreateTwilioTemplate({ onSuccess }) {
    const { showSnackbar } = useSnackbar();
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        friendly_name: '',
        language: 'de',
        body: '',
        variable_examples: ['Hans Smith'],
        type: 'twilio/quick-reply',
        buttons: DEFAULT_BUTTONS.map((b) => ({ ...b })),
        media_url: '',
    });

    const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    const setButton = (index, field, value) =>
        setForm((prev) => {
            const buttons = prev.buttons.map((b, i) =>
                i === index ? { ...b, [field]: value } : b
            );
            return { ...prev, buttons };
        });

    const setVariableExample = (index, value) =>
        setForm((prev) => {
            const variable_examples = prev.variable_examples.map((v, i) => i === index ? value : v);
            return { ...prev, variable_examples };
        });

    const addVariable = () =>
        setForm((prev) => ({ ...prev, variable_examples: [...prev.variable_examples, ''] }));

    const removeVariable = (index) =>
        setForm((prev) => ({
            ...prev,
            variable_examples: prev.variable_examples.filter((_, i) => i !== index),
        }));

    const isMediaType = form.type === 'twilio/media';

    // Derive variable names from the body (and media URL for media templates)
    // in order of first appearance — Twilio resolves {{...}} across both.
    const templateVars = useMemo(() => {
        const seen = new Set();
        const result = [];
        const pattern = /\{\{([^}]+)\}\}/g;
        const scan = (text) => {
            pattern.lastIndex = 0;
            let m;
            while ((m = pattern.exec(text || '')) !== null) {
                if (!seen.has(m[1])) { seen.add(m[1]); result.push(m[1]); }
            }
        };
        scan(form.body);
        if (isMediaType) scan(form.media_url);
        return result;
    }, [form.body, form.media_url, isMediaType]);

    const isSlugified = form.friendly_name !== '' && form.friendly_name === slugify(form.friendly_name);
    const isBodyFilled = form.body.trim() !== '';
    const isMediaFilled = !isMediaType || form.media_url.trim() !== '';
    const submitDisabledReason = !isBodyFilled && !isSlugified
        ? 'Message body and a normalized friendly name are required'
        : !isBodyFilled
        ? 'Message body is required'
        : !isMediaFilled
        ? 'A media URL (or {{variable}} placeholder) is required for media templates'
        : !isSlugified && !form.friendly_name
        ? 'Friendly name is required'
        : !isSlugified
        ? 'Friendly name must be normalized — click Normalize'
        : '';
    const canSubmit = isSlugified && isBodyFilled && isMediaFilled && !submitting;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.friendly_name.trim() || !form.body.trim()) {
            showSnackbar('Friendly name and body are required', 'error');
            return;
        }

        if (isMediaType && !form.media_url.trim()) {
            showSnackbar('A media URL is required for media templates', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_SERVERURL}/api/twilio/create-template`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    friendly_name: form.friendly_name.trim(),
                    language: form.language,
                    body: form.body,
                    variable_examples: form.variable_examples.map((v) => v.trim()).filter(Boolean),
                    type: form.type,
                    buttons: form.type === 'twilio/quick-reply'
                        ? form.buttons.filter((b) => b.title.trim())
                        : [],
                    media: isMediaType && form.media_url.trim()
                        ? [form.media_url.trim()]
                        : [],
                }),
            });
            const data = await res.json();
            if (data.status) {
                showSnackbar(`Template "${data.template.friendly_name}" created successfully`);
                onSuccess?.();
                setForm({
                    friendly_name: '',
                    language: 'de',
                    body: '',
                    variable_examples: ['Hans Smith'],
                    type: 'twilio/quick-reply',
                    buttons: DEFAULT_BUTTONS.map((b) => ({ ...b })),
                    media_url: '',
                });
            } else {
                showSnackbar(data.message || 'Failed to create template', 'error');
            }
        } catch (err) {
            console.error(err);
            showSnackbar('Unexpected error — check console', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
<form onSubmit={handleSubmit}>
     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="body2" color="text.secondary">
                Creates a <strong>{form.type}</strong> content template and submits it for WhatsApp approval.
                Use <code>{'{{1}}'}</code>, <code>{'{{2}}'}</code>, <code>{'{{3}}'}</code>… in the body for personalisation variables.
            </Typography>

            <Divider />

            {/* Template type */}
            <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Template Type
                </Typography>
                <ToggleButtonGroup
                    value={form.type}
                    exclusive
                    onChange={(_, v) => v && set('type', v)}
                    size="small"
                >
                    <ToggleButton value="twilio/quick-reply">Quick Reply</ToggleButton>
                    <ToggleButton value="twilio/text">Text only</ToggleButton>
                    <ToggleButton value="twilio/media">Media</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Name + Language row */}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <TextField
                    label="Friendly Name"
                    value={form.friendly_name}
                    onChange={(e) => set('friendly_name', e.target.value)}
                    required
                    size="small"
                    sx={{ flex: 3 }}
                    helperText="Lowercase, no spaces"
                />
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<SiAutoprefixer />}
                    onClick={() => set('friendly_name', slugify(form.friendly_name))}
                    tabIndex={-1}
                    sx={{ textTransform: 'none', whiteSpace: 'nowrap', mt: 0.5 }}
                >
                    Normalize
                </Button>
                <TextField
                    select
                    label="Language"
                    value={form.language}
                    onChange={(e) => set('language', e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                >
                    {LANGUAGES.map((l) => (
                        <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>
                    ))}
                </TextField>
            </Box>

            {isMediaType && (
                <TextField
                    label="Media URL"
                    value={form.media_url}
                    onChange={(e) => set('media_url', e.target.value)}
                    required
                    size="small"
                    placeholder="{{qr_code_url}}"
                    helperText="Public image/PDF URL, or a {{variable}} placeholder (e.g. {{qr_code_url}}) resolved per-recipient"
                />
            )}

            <TextField
                label="Message Body"
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
                required
                multiline
                minRows={7}
                size="small"
                helperText="Use {{1}}, {{2}}, {{3}}… for personalisation variables"
            />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                    Sample values shown to WhatsApp for approval
                </Typography>
                {form.variable_examples.map((val, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                            label={`Example value for {{${templateVars[i] ?? i + 1}}}`}
                            value={val}
                            onChange={(e) => setVariableExample(i, e.target.value)}
                            size="small"
                            sx={{ flex: 1 }}
                        />
                        {form.variable_examples.length > 1 && (
                            <IconButton size="small" onClick={() => removeVariable(i)} tabIndex={-1}>
                                <MdClose size={18} />
                            </IconButton>
                        )}
                    </Box>
                ))}
                <Button
                    size="small"
                    startIcon={<MdAdd />}
                    onClick={addVariable}
                    sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                >
                    Add Variable
                </Button>
            </Box>

            {form.type === 'twilio/quick-reply' && (
                <>
                    <Divider>Quick-Reply Buttons</Divider>
                    {form.buttons.map((btn, i) => (
                        <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                label={`Button ${i + 1} Title`}
                                value={btn.title}
                                onChange={(e) => setButton(i, 'title', e.target.value)}
                                size="small"
                                sx={{ flex: 2 }}
                            />
                            <TextField
                                label="ID"
                                value={btn.id}
                                onChange={(e) => setButton(i, 'id', e.target.value)}
                                size="small"
                                sx={{ flex: 1 }}
                            />
                        </Box>
                    ))}
                </>
            )}

            <Tooltip title={submitDisabledReason}>
                <span style={{ alignSelf: 'flex-start' }}>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!canSubmit}
                        sx={{ textTransform: 'none' }}
                    >
                        {submitting ? <CircularProgress size={20} color="inherit" /> : 'Create Template'}
                    </Button>
                </span>
            </Tooltip>
        </Box>
            </form>

    );
}
