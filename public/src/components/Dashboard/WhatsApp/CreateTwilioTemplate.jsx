import { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useSnackbar } from '../../Providers/Snackbar';

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
        variable_example: 'Hans Smith',
        type: 'twilio/quick-reply',
        buttons: DEFAULT_BUTTONS.map((b) => ({ ...b })),
    });

    const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    const setButton = (index, field, value) =>
        setForm((prev) => {
            const buttons = prev.buttons.map((b, i) =>
                i === index ? { ...b, [field]: value } : b
            );
            return { ...prev, buttons };
        });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.friendly_name.trim() || !form.body.trim()) {
            showSnackbar('Friendly name and body are required', 'error');
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
                    variable_example: form.variable_example.trim() || null,
                    type: form.type,
                    buttons: form.type === 'twilio/quick-reply'
                        ? form.buttons.filter((b) => b.title.trim())
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
                    variable_example: 'Hans',
                    type: 'twilio/quick-reply',
                    buttons: DEFAULT_BUTTONS.map((b) => ({ ...b })),
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
                Use <code>{'{{1}}'}</code> in the body for the personalisation variable.
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
                </ToggleButtonGroup>
            </Box>

            {/* Name + Language row */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField
                    label="Friendly Name"
                    value={form.friendly_name}
                    onChange={(e) => set('friendly_name', e.target.value)}
                    required
                    size="small"
                    sx={{ flex: 3 }}
                    helperText="Lowercase, no spaces"
                />
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

            <TextField
                label="Message Body"
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
                required
                multiline
                minRows={7}
                size="small"
                helperText="Use {{1}} for the personalisation variable"
            />

            <TextField
                label="Example value for {{1}}"
                value={form.variable_example}
                onChange={(e) => set('variable_example', e.target.value)}
                size="small"
                helperText='Actual sample shown to WhatsApp for approval, e.g. "Hans" or "Maria"'
            />

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

            <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
            >
                {submitting ? <CircularProgress size={20} color="inherit" /> : 'Create Template'}
            </Button>
        </Box>
            </form>

    );
}
