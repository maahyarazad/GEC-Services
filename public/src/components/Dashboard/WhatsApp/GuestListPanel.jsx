import { guestListColumns } from './WhatsAppComponentConfig';
import EventSearch from './EventSearch';
import {
    Box, Chip, CircularProgress, Typography,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Checkbox, FormGroup, FormControlLabel,
} from '@mui/material';
import { getSelectedGuestList, getSelectedEvent, getGuestListLoading } from '../../../features/eventSlice';
import { useAppSelector } from '../../../store/hooks';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import NotepadModal from './NotepadModal';
import CustomDataGrid from '../../CustomDataGrid';
import { useSnackbar } from '../../Providers/Snackbar';

const SERVER = import.meta.env.VITE_SERVERURL;

export default function GuestListPanel({ onGuestAttend, onRemoveGuest, mediaTemplates = [] }) {
    const selectedGuestList = useAppSelector(getSelectedGuestList);
    const eventId = useAppSelector(getSelectedEvent);
    const guestListLoading = useAppSelector(getGuestListLoading);
    const { showSnackbar } = useSnackbar();

    // Primitive event key — everything that only cares about "which event"
    // depends on this rather than the (possibly re-created) object reference.
    const eid = eventId?.id;

    // ── WhatsApp media-template selection (opens when an event is clicked) ────
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [checkedSids, setCheckedSids] = useState(() => new Set());
    const [selectedContentSids, setSelectedContentSids] = useState([]);
    // Gate: hold every guest-list resource request until the operator resolves
    // the template modal (either Skips or Confirms a selection).
    const [choiceMade, setChoiceMade] = useState(false);
    const lastPromptedEventRef = useRef(null);

    // ── QR view modal ────────────────────────────────────────────────────────
    const [qrViewOpen, setQrViewOpen] = useState(false);
    const [qrViewUrl, setQrViewUrl] = useState(null);
    const [qrViewLoading, setQrViewLoading] = useState(false);
    // Tracks the live object URL so it can always be revoked exactly once,
    // regardless of how the viewer is dismissed (close / event switch / unmount).
    const objectUrlRef = useRef(null);
    const revokeQrUrl = useCallback(() => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }, []);

    // ── Per-event derived data (fetched) ─────────────────────────────────────
    const [activeMemberPhones, setActiveMemberPhones] = useState(new Map());
    const [clubtimeHistory, setClubtimeHistory] = useState(new Map());
    const [guestNotes, setGuestNotes] = useState(new Map());
    const [guestQrCodes, setGuestQrCodes] = useState(new Map());
    const [guestQrGenerated, setGuestQrGenerated] = useState(new Map());

    // ── Notepad modal ────────────────────────────────────────────────────────
    const [notepadOpen, setNotepadOpen] = useState(false);
    const [notepadContactId, setNotepadContactId] = useState(null);
    const [notepadContactName, setNotepadContactName] = useState('');

    // Wipe EVERYTHING tied to an event the moment the selected event changes
    // (or is cleared), so no stale data, selection, or open modal from the
    // previous event can ever be shown against the new one. Requests are
    // re-gated (choiceMade → false) until the template modal is resolved again.
    useEffect(() => {
        setActiveMemberPhones(new Map());
        setClubtimeHistory(new Map());
        setGuestNotes(new Map());
        setGuestQrCodes(new Map());
        setGuestQrGenerated(new Map());

        setCheckedSids(new Set());
        setSelectedContentSids([]);
        setChoiceMade(false);

        setNotepadOpen(false);
        setNotepadContactId(null);
        setNotepadContactName('');

        setQrViewOpen(false);
        setQrViewLoading(false);
        revokeQrUrl();
        setQrViewUrl(null);
    }, [eid, revokeQrUrl]);

    // Prompt the template checklist once per event, once its list has loaded.
    // (State was already cleared by the reset effect above.) With no templates
    // there is nothing to choose, so requests are released immediately.
    useEffect(() => {
        if (!eid || guestListLoading) return;
        if (lastPromptedEventRef.current === eid) return;
        lastPromptedEventRef.current = eid;
        if (mediaTemplates.length) {
            setTemplateModalOpen(true); // choiceMade stays false until resolved
        } else {
            setChoiceMade(true);        // nothing to pick — release the gate
        }
    }, [eid, guestListLoading, mediaTemplates.length]);

    const toggleSid = useCallback((sid) => {
        setCheckedSids((prev) => {
            const next = new Set(prev);
            next.has(sid) ? next.delete(sid) : next.add(sid);
            return next;
        });
    }, []);

    const handleConfirmTemplates = useCallback(() => {
        const sids = [...checkedSids];
        setSelectedContentSids(sids);
        setTemplateModalOpen(false);
        setChoiceMade(true); // release the held resource requests
        showSnackbar(`${sids.length} media template${sids.length === 1 ? '' : 's'} selected for QR Code delivery.`, 'success');
    }, [checkedSids, showSnackbar]);

    const handleSkipTemplates = useCallback(() => {
        setCheckedSids(new Set());
        setSelectedContentSids([]);
        setTemplateModalOpen(false);
        setChoiceMade(true); // release the held resource requests
        showSnackbar('Warning: You have opted out of receiving QR Code delivery information.', 'warning');
    }, [showSnackbar]);

    // Number of guests who completed attendance — memoized so the chip label
    // doesn't re-scan the whole list on every render.
    const attendedCount = useMemo(
        () => (selectedGuestList ?? []).filter((x) => x && Number(x.complete_attendance) === 1).length,
        [selectedGuestList]
    );

    // Shared lookups derived from the guest list, computed once per list change
    // instead of being re-scanned inside every fetcher.
    const guestIds = useMemo(
        () => (selectedGuestList ?? []).map((c) => c.id).filter(Boolean),
        [selectedGuestList]
    );
    const guestPhones = useMemo(
        () => [...new Set((selectedGuestList ?? []).map((c) => c.phone).filter(Boolean))],
        [selectedGuestList]
    );
    const guestFullNames = useMemo(
        () => [...new Set(
            (selectedGuestList ?? [])
                .map((c) => `${c.first_name?.trimEnd() ?? ''} ${c.last_name?.trimEnd() ?? ''}`.trim())
                .filter(Boolean)
        )],
        [selectedGuestList]
    );

    const fetchGuestNotes = useCallback((signal) => {
        if (!guestIds.length) { setGuestNotes(new Map()); return; }
        fetch(`${SERVER}/api/contacts/notes/by-ids`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ ids: guestIds }), signal,
        })
            .then((r) => r.json())
            .then((d) => { if (d.status) setGuestNotes(new Map(d.data.map((n) => [n.contact_book_id, n.note_body]))); })
            .catch((e) => { if (e.name !== 'AbortError') console.error(e); });
    }, [guestIds]);

    const fetchQrCodes = useCallback((signal) => {
        if (!guestIds.length) { setGuestQrCodes(new Map()); return; }
        fetch(`${SERVER}/api/events/qr-code/by-ids`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ ids: guestIds, eventId, contentSids: selectedContentSids }), signal,
        })
            .then((r) => r.json())
            .then((d) => { if (d.status) setGuestQrCodes(new Map(d.data.map((n) => [n.contact_book_id, n.qr]))); })
            .catch((e) => { if (e.name !== 'AbortError') console.error(e); });
    }, [guestIds, eventId, selectedContentSids]);

    // Whether each guest's QR code PNG has actually been generated (file check).
    const fetchQrGenerated = useCallback((signal) => {
        if (!guestIds.length) { setGuestQrGenerated(new Map()); return; }
        fetch(`${SERVER}/api/events/qr-code-generated/by-ids`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ ids: guestIds, eventId }), signal,
        })
            .then((r) => r.json())
            .then((d) => { if (d.status) setGuestQrGenerated(new Map(d.data.map((n) => [n.contact_book_id, n.qr]))); })
            .catch((e) => { if (e.name !== 'AbortError') console.error(e); });
    }, [guestIds, eventId]);

    // Active-member lookup keyed by normalized phone and full name.
    const fetchActiveMembers = useCallback((signal) => {
        if (!guestPhones.length) { setActiveMemberPhones(new Map()); return; }
        fetch(`${SERVER}/api/gec/members/check-batch`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ phone_numbers: guestPhones, full_names: guestFullNames }), signal,
        })
            .then((r) => r.json())
            .then((d) => {
                if (!d.status) return;
                const entries = [];
                d.data.forEach((r) => {
                    if (r.phone) entries.push([r.phone.replace(/[+\-\s]/g, ''), r]);
                    const fullName = `${r.first_name ?? ''} ${r.name ?? ''}`.trim();
                    if (fullName) entries.push([fullName, r]);
                });
                setActiveMemberPhones(new Map(entries));
            })
            .catch((e) => { if (e.name !== 'AbortError') console.error(e); });
    }, [guestPhones, guestFullNames]);

    // Past Events Log: find each guest's prior ClubTime / Business Breakfast
    // appearances by normalized phone OR full name, keyed for fast row lookup.
    const fetchClubtimeHistory = useCallback((signal) => {
        if (!guestPhones.length) { setClubtimeHistory(new Map()); return; }
        fetch(`${SERVER}/api/clubtime_guest_logs/check-batch`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ phone_numbers: guestPhones, full_names: guestFullNames, eventId }), signal,
        })
            .then((r) => r.json())
            .then((d) => {
                if (!d.status) return;
                const map = new Map();
                const push = (key, rec) => {
                    if (!key) return;
                    const arr = map.get(key);
                    if (arr) arr.push(rec); else map.set(key, [rec]);
                };
                (d.data ?? []).forEach((r) => {
                    push(String(r.mobile ?? '').replace(/[+\-\s]/g, ''), r);
                    push(String(r.name ?? '').trim().replace(/\s+/g, ' ').toLowerCase(), r);
                });
                setClubtimeHistory(map);
            })
            .catch((e) => { if (e.name !== 'AbortError') console.error(e); });
    }, [guestPhones, guestFullNames, eventId]);

    // All per-event resources are fetched together under a single AbortController
    // once the template gate is open. They re-run when their inputs (the derived
    // guest lookups / event / selected templates) change, and any in-flight
    // request is aborted on cleanup — including when the gate closes on an
    // event switch, so a premature fetch can never land against the new event.
    useEffect(() => {
        if (!choiceMade) return;
        const controller = new AbortController();
        const { signal } = controller;
        fetchGuestNotes(signal);
        fetchQrCodes(signal);
        fetchQrGenerated(signal);
        fetchActiveMembers(signal);
        fetchClubtimeHistory(signal);
        return () => controller.abort();
    }, [choiceMade, fetchGuestNotes, fetchQrCodes, fetchQrGenerated, fetchActiveMembers, fetchClubtimeHistory]);

    // Revoke any leftover QR object URL if the component unmounts while open.
    useEffect(() => revokeQrUrl, [revokeQrUrl]);

    // Fetch and display an already-generated QR code in a modal.
    const handleViewQr = useCallback((row) => {
        setQrViewOpen(true);
        setQrViewLoading(true);
        revokeQrUrl();
        setQrViewUrl(null);
        fetch(`${SERVER}/api/events/qr-code/view`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ contactId: row.id, eventId }),
        })
            .then((r) => { if (!r.ok) throw new Error('QR not found'); return r.blob(); })
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                objectUrlRef.current = url;
                setQrViewUrl(url);
            })
            .catch((e) => { console.error(e); showSnackbar('Could not load QR code.', 'error'); setQrViewOpen(false); })
            .finally(() => setQrViewLoading(false));
    }, [eventId, showSnackbar, revokeQrUrl]);

    const closeQrView = useCallback(() => {
        setQrViewOpen(false);
        revokeQrUrl();
        setQrViewUrl(null);
    }, [revokeQrUrl]);

    const handleOpenNotepad = useCallback((row) => {
        setNotepadContactId(row.id);
        setNotepadContactName(`${row.first_name ?? ''} ${row.last_name ?? ''}`.trim());
        setNotepadOpen(true);
    }, []);

    const closeNotepad = useCallback(() => {
        setNotepadOpen(false);
        setNotepadContactId(null);
        setNotepadContactName('');
    }, []);

    // Column definitions rebuild only when their inputs change, not every render.
    const columns = useMemo(
        () => guestListColumns({ onGuestAttend, onRemoveGuest, activeMemberPhones, clubtimeHistory, onOpenNotepad: handleOpenNotepad, notes: guestNotes, guestQrCodes, guestQrGenerated, onViewQr: handleViewQr }),
        [onGuestAttend, onRemoveGuest, activeMemberPhones, clubtimeHistory, handleOpenNotepad, guestNotes, guestQrCodes, guestQrGenerated, handleViewQr]
    );

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'flex-start',
            gap: 2,
            width: '100%',
            height: '100%',
            p: 1,
        }}>
            <Box sx={{ flexShrink: 0, width: { xs: '100%', md: 280 } }}>
                <EventSearch />
            </Box>
            <Box sx={{
                flex: 1,
                minWidth: 0,
                height: { xs: '60dvh', md: '85dvh' },
                width: { xs: '100%', md: 'auto' },
                display: 'flex',
                flexDirection: 'column',
            }}>
                {/* Total guest count for the selected event — top-right of the panel.
                    Hidden until an event is selected and its data has loaded. */}
                {eventId && !guestListLoading && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mb: 0.5 }}>
                        <Chip
                            label={`Attendance Progress: ${attendedCount} / ${selectedGuestList?.length ?? 0}`}
                            color="primary"
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                    </Box>
                )}
                <Box sx={{ flex: 1, minHeight: 0 }}>
                    {!eventId ? (
                        // No event selected — show a placeholder, never the grid.
                        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography color="text.secondary">No event selected.</Typography>
                        </Box>
                    ) : guestListLoading ? (
                        // Switching events: the old grid is unmounted and a loader
                        // is shown until the new event's guest list finishes loading.
                        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        // Fresh grid per event — `key` forces a remount so no
                        // pagination/sort/filter/selection state carries over.
                        <CustomDataGrid
                            key={eid}
                            rows={selectedGuestList}
                            columns={columns}
                            rowsPerPageOptions={[25, 50, 100]}
                            disableRowSelectionOnClick
                            showToolbar
                        />
                    )}
                </Box>
                <NotepadModal
                    open={notepadOpen}
                    onClose={closeNotepad}
                    contactId={notepadContactId}
                    contactName={notepadContactName}
                    onSaved={fetchGuestNotes}
                />
            </Box>

            {/* WhatsApp media-template checklist — shown when an event is opened */}
            <Dialog open={templateModalOpen} onClose={handleSkipTemplates} fullWidth maxWidth="xs">
                <DialogTitle>QR Code Delivery Templates</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Select one or more WhatsApp media templates to get QR codes delivery, or skip.
                    </Typography>
                    {mediaTemplates.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            No media templates available.
                        </Typography>
                    ) : (
                        <FormGroup>
                            {mediaTemplates.map((t) => (
                                <FormControlLabel
                                    key={t.value}
                                    control={
                                        <Checkbox
                                            size="small"
                                            checked={checkedSids.has(t.value)}
                                            onChange={() => toggleSid(t.value)}
                                        />
                                    }
                                    label={t.label}
                                />
                            ))}
                        </FormGroup>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleSkipTemplates} color="inherit" sx={{ textTransform: 'none' }}>
                        Skip
                    </Button>
                    <Button
                        onClick={handleConfirmTemplates}
                        variant="contained"
                        disabled={checkedSids.size === 0}
                        sx={{ textTransform: 'none' }}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            {/* QR code viewer */}
            <Dialog open={qrViewOpen} onClose={closeQrView} maxWidth="xs">
                <DialogTitle>QR Code</DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 260, minWidth: 260 }}>
                    {qrViewLoading ? (
                        <CircularProgress />
                    ) : qrViewUrl ? (
                        <img src={qrViewUrl} alt="Guest QR code" style={{ width: 240, height: 240 }} />
                    ) : (
                        <Typography variant="body2" color="text.secondary">No QR code to display.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeQrView} sx={{ textTransform: 'none' }}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}