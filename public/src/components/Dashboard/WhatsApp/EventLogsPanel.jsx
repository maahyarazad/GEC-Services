import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { MdOutlineStickyNote2, MdReceiptLong } from 'react-icons/md';
import _CustomDataGrid from '../../CustomDataGrid';
import NotepadModal from './NotepadModal';

// Feature 24 — Past Events Log.
// Server-side paginated / filtered / sorted view of the `clubtime_guests` table,
// rendered inside the WhatsApp "Event Logs" slider. Note & Remarks are shown
// (read-only) through NotepadModal from the Actions column.

const PAGE_SIZE = 25;

const buildFilterParams = (filterItems = []) => {
    const active = filterItems.filter(
        (f) => f.value !== '' || ['isEmpty', 'isNotEmpty'].includes(f.operator)
    );
    if (active.length === 0) return '';
    return active
        .map((f) =>
            `filterField[]=${encodeURIComponent(f.field)}` +
            `&filterOperator[]=${encodeURIComponent(f.operator)}` +
            `&filterValue[]=${encodeURIComponent(f.value ?? '')}`
        )
        .join('&');
};

export default function EventLogsPanel({ active }) {
    const [rows, setRows] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: PAGE_SIZE });
    const [sortModel, setSortModel] = useState([{ field: 'event_date', sort: 'desc' }]);
    const [filterItems, setFilterItems] = useState([]);
    const [debouncedFilterItems, setDebouncedFilterItems] = useState([]);

    // Notepad (read-only) state shared by both Note and Remarks
    const [notepad, setNotepad] = useState({ open: false, title: '', value: '' });

    const openNotepad = (title, value) => setNotepad({ open: true, title, value: value ?? '' });
    const closeNotepad = () => setNotepad((n) => ({ ...n, open: false }));

    // Debounce filter changes so we don't hammer the server on every keystroke
    useEffect(() => {
        const t = setTimeout(() => setDebouncedFilterItems(filterItems), 400);
        return () => clearTimeout(t);
    }, [filterItems]);

    const fetchData = useCallback(async (pagination, sort, filters) => {
        try {
            setLoading(true);
            const { field: sortField = '', sort: sortOrder = '' } = (sort ?? [])[0] ?? {};
            const filterParams = buildFilterParams(filters ?? []);

            const queryParams = [
                `page=${(pagination?.page ?? 0) + 1}`,
                `pageSize=${pagination?.pageSize ?? PAGE_SIZE}`,
                sortField ? `sortField=${sortField}` : '',
                sortOrder ? `sortOrder=${sortOrder}` : '',
                filterParams,
            ].filter(Boolean).join('&');

            const res = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/clubtime_guest_logs?${queryParams}`,
                { credentials: 'include' }
            );
            if (res.status === 200) {
                const data = await res.json();
                setRows(data.data ?? []);
                if (data.total !== undefined) setRowCount(data.total);
            }
        } catch (err) {
            console.error('Failed to fetch event logs:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Only fetch while the panel is open
    useEffect(() => {
        if (!active) return;
        fetchData(paginationModel, sortModel, debouncedFilterItems);
    }, [active, fetchData, paginationModel, sortModel, debouncedFilterItems]);

    const columns = [
        { field: 'event_date', headerName: 'Date', width: 110 },
        { field: 'event_title', headerName: 'Event', width: 180 },
        { field: 'event_type', headerName: 'Type', width: 150 },
        { field: 'name', headerName: 'Name', width: 160 },
        { field: 'member_partner', headerName: 'Member / Partner', width: 190 },
        { field: 'mobile', headerName: 'Mobile', width: 140 },
        { field: 'invitee', headerName: 'Invitee', width: 120 },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 110,
            sortable: false,
            filterable: false,
            renderCell: ({ row }) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title={row.note ? 'View note' : 'No note'}>
                        <span>
                            <IconButton
                                size="small"
                                color="warning"
                                disabled={!row.note}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openNotepad(`Note – ${row.name}`, row.note);
                                }}
                            >
                                <MdOutlineStickyNote2 size={18} />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title={row.remarks ? 'View remarks' : 'No remarks'}>
                        <span>
                            <IconButton
                                size="small"
                                color="primary"
                                disabled={!row.remarks}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openNotepad(`Remarks – ${row.name}`, row.remarks);
                                }}
                            >
                                <MdReceiptLong size={18} />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    return (
        <Box sx={{ width: '100%', height: 'calc(100vh - 125px)' }}>
            <_CustomDataGrid
                rows={rows}
                columns={columns}
                loading={loading}

                filterMode="server"
                sortingMode="server"
                paginationMode="server"

                rowCount={rowCount}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                rowsPerPageOptions={[25, 50, 100]}

                sortModel={sortModel}
                onSortModelChange={setSortModel}

                filterItems={filterItems}
                onFilterItemsChange={setFilterItems}

                disableRowSelectionOnClick
            />

            <NotepadModal
                open={notepad.open}
                readOnly
                title={notepad.title}
                value={notepad.value}
                onClose={closeNotepad}
            />
        </Box>
    );
}
