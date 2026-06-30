import { guestListColumns } from './WhatsAppComponentConfig';
import EventSearch from './EventSearch';
import { Box, Chip, CircularProgress, Typography } from '@mui/material';
import { getSelectedGuestList, getSelectedEvent, getGuestListLoading } from '../../../features/eventSlice';
import { useAppSelector } from '../../../store/hooks';
import { useState, useEffect, useCallback, useMemo } from 'react';
import NotepadModal from './NotepadModal';
import CustomDataGrid from '../../CustomDataGrid';


export default function GuestListPanel({ onGuestAttend, onRemoveGuest }) {
    const selectedGuestList = useAppSelector(getSelectedGuestList);
    const eventId = useAppSelector(getSelectedEvent);
    const guestListLoading = useAppSelector(getGuestListLoading);

    // Number of guests who completed attendance — memoized so the chip label
    // doesn't re-scan the whole list on every render.
    const attendedCount = useMemo(
        () => (selectedGuestList ?? []).filter((x) => x && Number(x.complete_attendance) === 1).length,
        [selectedGuestList]
    );

    const [activeMemberPhones, setActiveMemberPhones] = useState(new Map());
    const [clubtimeHistory, setClubtimeHistory] = useState(new Map());
    const [guestNotes, setGuestNotes] = useState(new Map());

    const fetchGuestNotes = useCallback((signal) => {
        const ids = selectedGuestList.map(c => c.id).filter(Boolean);
        if (!ids.length) { setGuestNotes(new Map()); return; }
        fetch(`${import.meta.env.VITE_SERVERURL}/api/contacts/notes/by-ids`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ ids }), signal,
        })
            .then(r => r.json())
            .then(d => { if (d.status) setGuestNotes(new Map(d.data.map(n => [n.contact_book_id, n.note_body]))); })
            .catch((e) => { if (e.name !== 'AbortError') console.error(e); });
    }, [selectedGuestList]);

    useEffect(() => {
        const controller = new AbortController();
        fetchGuestNotes(controller.signal);
        return () => controller.abort();
    }, [fetchGuestNotes, guestListLoading]);

    const [notepadOpen, setNotepadOpen] = useState(false);
    const [notepadContactId, setNotepadContactId] = useState(null);
    const [notepadContactName, setNotepadContactName] = useState('');
    const handleOpenNotepad = useCallback((row) => {
        setNotepadContactId(row.id);
        setNotepadContactName(`${row.first_name ?? ''} ${row.last_name ?? ''}`.trim());
        setNotepadOpen(true);
    }, []);

    // Active-member lookup keyed by normalized phone and full name.
    const fetchActiveMembers = useCallback((signal) => {
        const phones = [...new Set(selectedGuestList.map((c) => c.phone).filter(Boolean))];
        if (!phones.length) { setActiveMemberPhones(new Map()); return; }
        const full_names = [...new Set(selectedGuestList.map((c) => `${c.first_name?.trimEnd() ?? ''} ${c.last_name?.trimEnd() ?? ''}`.trim()).filter(Boolean))];
        fetch(`${import.meta.env.VITE_SERVERURL}/api/gec/members/check-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ phone_numbers: phones, full_names }),
            signal,
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
    }, [selectedGuestList]);

    useEffect(() => {
        const controller = new AbortController();
        fetchActiveMembers(controller.signal);
        return () => controller.abort();
    }, [fetchActiveMembers, guestListLoading]);

    // Past Events Log: find each guest's prior ClubTime / Business Breakfast
    // appearances by normalized phone OR full name, keyed for fast row lookup.
    const fetchClubtimeHistory = useCallback((signal) => {
        const phones = [...new Set(selectedGuestList.map((c) => c.phone).filter(Boolean))];
        if (!phones.length) { setClubtimeHistory(new Map()); return; }
        const full_names = [...new Set(selectedGuestList.map((c) => `${c.first_name?.trimEnd() ?? ''} ${c.last_name?.trimEnd() ?? ''}`.trim()).filter(Boolean))];
        fetch(`${import.meta.env.VITE_SERVERURL}/api/clubtime_guest_logs/check-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ phone_numbers: phones, full_names, eventId }),
            signal,
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
    }, [selectedGuestList, eventId]);

    useEffect(() => {
        const controller = new AbortController();
        fetchClubtimeHistory(controller.signal);
        return () => controller.abort();
    }, [fetchClubtimeHistory]);

    // Column definitions rebuild only when their inputs change, not every render.
    const columns = useMemo(
        () => guestListColumns({ onGuestAttend, onRemoveGuest, activeMemberPhones, clubtimeHistory, onOpenNotepad: handleOpenNotepad, notes: guestNotes }),
        [onGuestAttend, onRemoveGuest, activeMemberPhones, clubtimeHistory, handleOpenNotepad, guestNotes]
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
                            label={`Attendance Progress: ${attendedCount} / ${selectedGuestList.length}`}
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
                            key={eventId.id}
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
                    onClose={() => { setNotepadOpen(false); setNotepadContactId(null); setNotepadContactName(''); }}
                    contactId={notepadContactId}
                    contactName={notepadContactName}
                    onSaved={fetchGuestNotes}
                />
            </Box>
        </Box>
    );
}
