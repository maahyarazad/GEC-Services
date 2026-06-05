import { guestListColumns } from './WhatsAppComponentConfig';
import EventSearch from './EventSearch';
import { Box } from '@mui/material';
import { getSelectedGuestList } from '../../../features/eventSlice';
import { useAppSelector } from '../../../store/hooks';
import { useState, useEffect, useCallback } from 'react';
import NotepadModal from './NotepadModal';
import CustomDataGrid from '../../CustomDataGrid';

export default function GuestListPanel({ onGuestAttend, onRemoveGuest }) {
    const selectedGuestList = useAppSelector(getSelectedGuestList);
    const [activeMemberPhones, setActiveMemberPhones] = useState(new Map());
    const [guestNotes, setGuestNotes] = useState(new Map());

    const fetchGuestNotes = useCallback(() => {
        const ids = selectedGuestList.map(c => c.id).filter(Boolean);
        if (!ids.length) { setGuestNotes(new Map()); return; }
        fetch(`${import.meta.env.VITE_SERVERURL}/api/contacts/notes/by-ids`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ ids }),
        }).then(r => r.json()).then(d => { if (d.status) setGuestNotes(new Map(d.data.map(n => [n.contact_book_id, n.note_body]))); }).catch(() => {});
    }, [selectedGuestList]);
    useEffect(() => { fetchGuestNotes(); }, [fetchGuestNotes]);
    const [notepadOpen, setNotepadOpen] = useState(false);
    const [notepadContactId, setNotepadContactId] = useState(null);
    const [notepadContactName, setNotepadContactName] = useState('');
    const handleOpenNotepad = (row) => { setNotepadContactId(row.id); setNotepadContactName(`${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()); setNotepadOpen(true); };

    useEffect(() => {
        const phones = [...new Set(selectedGuestList.map((c) => c.phone).filter(Boolean))];
        if (!phones.length) { setActiveMemberPhones(new Map()); return; }
        const full_names = [...new Set(selectedGuestList.map((c) => `${c.first_name?.trimEnd() ?? ''} ${c.last_name?.trimEnd() ?? ''}`.trim()).filter(Boolean))];
        fetch(`${import.meta.env.VITE_SERVERURL}/api/gec/members/check-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ phone_numbers: phones, full_names }),
        })
            .then((r) => r.json())
            .then((d) => {
                if (d.status) {
                    const entries = [];
                    d.data.forEach(r => {
                        if (r.phone) entries.push([r.phone.replace(/[+\-\s]/g, ''), r]);
                        const fullName = `${r.first_name ?? ''} ${r.name ?? ''}`.trim();
                        if (fullName) entries.push([fullName, r]);
                    });
                    setActiveMemberPhones(new Map(entries));
                }
            })
            .catch(() => {});
    }, [selectedGuestList]);

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
            }}>
                <CustomDataGrid
                    rows={selectedGuestList}
                    columns={guestListColumns({ onGuestAttend, onRemoveGuest, activeMemberPhones, onOpenNotepad: handleOpenNotepad, notes: guestNotes })}
                    rowsPerPageOptions={[25, 50, 100]}
                    disableRowSelectionOnClick
                    showToolbar
                />
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
