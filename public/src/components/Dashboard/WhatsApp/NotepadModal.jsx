import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, CircularProgress, Box,
} from '@mui/material';
import { useAlertDialog } from '../../Providers/AlertProvider';

export default function NotepadModal({ open, onClose, contactId, contactPhone, contactName, onSaved, readOnly = false, value = '', title }) {
    const [resolvedId, setResolvedId] = useState(null);
    const [note, setNote] = useState('');
    const [noteId, setNoteId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const { openDialog } = useAlertDialog();
    const SERVERURL = import.meta.env.VITE_SERVERURL;

    // Read-only display mode: show the supplied text verbatim, no fetch / no save.
    // Used by the Event Logs grid to display the plain `note` / `remarks` columns.
    useEffect(() => {
        if (open && readOnly) setNote(value ?? '');
    }, [open, readOnly, value]);

    // Resolve contact id (direct or by phone lookup)
    useEffect(() => {
        if (!open || readOnly) return;
        if (contactId) { setResolvedId(contactId); return; }
        if (contactPhone) {
            fetch(`${SERVERURL}/api/contacts/lookup?phone=${encodeURIComponent(contactPhone)}`, { credentials: 'include' })
                .then(r => r.json())
                .then(d => setResolvedId(d.status && d.data ? d.data.id : null))
                .catch(() => setResolvedId(null));
        }
    }, [open, contactId, contactPhone, readOnly]);

    // Fetch existing note once id is resolved
    useEffect(() => {
        if (!open || readOnly || !resolvedId) return;
        setLoading(true);
        fetch(`${SERVERURL}/api/contacts/${resolvedId}/notes`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => {
                if (d.status && d.data) { setNote(d.data.note_body ?? ''); setNoteId(d.data.id); }
                else { setNote(''); setNoteId(null); }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [open, resolvedId, readOnly]);

    const reset = () => { setNote(''); setNoteId(null); setResolvedId(null); };

    const handleClose = () => { reset(); onClose(); };

    const doDelete = async () => {
        if (noteId) {
            await fetch(`${SERVERURL}/api/contacts/notes/${noteId}`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
        }
        reset();
        onClose();
        onSaved?.();
    };

    const doSave = async () => {
        if (!resolvedId) return;
        setSaving(true);
        try {
            const res = await fetch(`${SERVERURL}/api/contacts/${resolvedId}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ note_body: note }),
            });
            const d = await res.json();
            if (d.status) { setNoteId(d.id ?? noteId); }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
            reset();
            onClose();
            onSaved?.();
        }
    };

    const handleSave = () => {
        if (!note.trim()) {
            if (noteId) {
                openDialog(
                    'The note is empty. Do you want to delete it?',
                    'Delete Note',
                    { text: 'Delete', color: 'error' },
                    doDelete,
                    null
                );
            } else {
                handleClose();
            }
            return;
        }
        doSave();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 600 }}>
                {title ?? `Notepad${contactName ? ` – ${contactName}` : ''}`}
            </DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TextField
                        multiline
                        rows={10}
                        fullWidth
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={readOnly ? 'No content.' : 'Write a note...'}
                        InputProps={{ readOnly }}
                        sx={{
                            mt: 1,
                            '& .MuiInputBase-root': {
                                backgroundColor: '#fff9c4',
                                fontFamily: '"Segoe UI", sans-serif',
                                fontSize: '0.95rem',
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#f9a825',
                                borderWidth: 2,
                            },
                            '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#f57f17',
                            },
                            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#e65100',
                            },
                        }}
                    />
                )}
            </DialogContent>
            <DialogActions>
                {readOnly ? (
                    <Button onClick={handleClose} variant="contained" sx={{textTransform: 'none'}}>Close</Button>
                ) : (
                    <>
                        <Button onClick={handleClose} disabled={saving} sx={{textTransform: 'none'}}>Cancel</Button>
                        <Button onClick={handleSave} variant="contained" disabled={saving || loading} sx={{textTransform: 'none'}}>
                            {saving ? 'Saving…' : 'Save'}
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}
