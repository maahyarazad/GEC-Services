import { useRef, useState, useMemo } from 'react';
import { Box, Typography, CircularProgress, TablePagination, InputBase } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { BiSolidCheckCircle } from 'react-icons/bi';
import { FaStickyNote } from 'react-icons/fa';

const LONG_PRESS_MS = 500;

const AVATAR_COLORS = [
    '#ef5350', '#ec407a', '#ab47bc', '#7e57c2',
    '#42a5f5', '#26c6da', '#26a69a', '#66bb6a',
    '#ffa726', '#ff7043', '#8d6e63', '#78909c',
];

function avatarColor(name) {
    if (!name) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function ResponseItem({ row, activeMemberPhones, notes, onViewJson, onOpenNotepad }) {
    const longPressTimer = useRef(null);
    const didLongPress = useRef(false);

    const displayName = row.full_name || row.ProfileName || row.WaId || 'Unknown';
    const phone = (row.WaId || '').replace(/[+\-\s]/g, '');
    const fullName = (row.full_name || row.ProfileName || '').trim();
    const member = activeMemberPhones?.get(phone) || activeMemberPhones?.get(fullName);
    const hasNote = !!notes?.get(row.WaId);
    const bgColor = avatarColor(displayName);

    const handlePointerDown = () => {
        didLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            didLongPress.current = true;
            onOpenNotepad?.(row.WaId, row.full_name || row.ProfileName);
        }, LONG_PRESS_MS);
    };

    const handlePointerUp = () => {
        clearTimeout(longPressTimer.current);
        if (!didLongPress.current) {
            try {
                onViewJson(JSON.parse(row.payload), 'instant_reply', row.full_name);
            } catch { /* ignore malformed payload */ }
        }
    };

    const cancelLongPress = () => clearTimeout(longPressTimer.current);

    return (
        <Box
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onContextMenu={(e) => e.preventDefault()}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.25,
                borderBottom: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                '&:active': { bgcolor: 'action.selected' },
            }}
        >
            {/* Avatar */}
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
                <Box sx={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    bgcolor: bgColor,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 600,
                }}>
                    {displayName.charAt(0).toUpperCase()}
                </Box>
                {member && (
                    <BiSolidCheckCircle
                        size={16}
                        color="green"
                        style={{ position: 'absolute', bottom: 0, right: 0, background: '#fff', borderRadius: '50%' }}
                    />
                )}
                {hasNote && (
                    <FaStickyNote
                        size={12}
                        color="#e65100"
                        style={{ position: 'absolute', top: 0, right: 0, background: '#fff', borderRadius: '2px' }}
                    />
                )}
            </Box>

            {/* Info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
                    <Typography sx={{
                        fontWeight: 600,
                        fontSize: 15,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                        mr: 1,
                    }}>
                        {displayName}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 11, flexShrink: 0 }}>
                        {formatTime(row.received_at)}
                    </Typography>
                </Box>
                <Typography sx={{
                    color: 'text.secondary',
                    fontSize: 13,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                }}>
                    {row.Body || `[${row.MessageType || 'message'}]`}
                </Typography>
            </Box>
        </Box>
    );
}

export default function ResponseLogsMobileList({
    rows = [],
    loading = false,
    rowCount = 0,
    paginationModel,
    onPaginationModelChange,
    activeMemberPhones,
    notes,
    onViewJson,
    onOpenNotepad,
}) {
    const [search, setSearch] = useState('');

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) => {
            const name = (row.full_name || row.ProfileName || '').toLowerCase();
            return name.includes(term);
        });
    }, [rows, search]);

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
            {/* Search bar */}
            <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                px: 2, py: 1,
                borderBottom: '1px solid', borderColor: 'divider',
                bgcolor: '#f0f2f5',
            }}>
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                <InputBase
                    placeholder="Search by name…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ flex: 1, fontSize: 14 }}
                    inputProps={{ 'aria-label': 'search contacts' }}
                />
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                {loading && (
                    <Box sx={{
                        position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'rgba(255,255,255,0.7)', zIndex: 1,
                    }}>
                        <CircularProgress size={32} />
                    </Box>
                )}
                {filteredRows.length === 0 && !loading && (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            {search ? 'No results found' : 'No messages'}
                        </Typography>
                    </Box>
                )}
                {filteredRows.map((row) => (
                    <ResponseItem
                        key={row.id}
                        row={row}
                        activeMemberPhones={activeMemberPhones}
                        notes={notes}
                        onViewJson={onViewJson}
                        onOpenNotepad={onOpenNotepad}
                    />
                ))}
            </Box>

            <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                <TablePagination
                    component="div"
                    count={rowCount}
                    page={paginationModel?.page ?? 0}
                    onPageChange={(_, newPage) =>
                        onPaginationModelChange?.({ ...paginationModel, page: newPage })
                    }
                    rowsPerPage={paginationModel?.pageSize ?? 25}
                    onRowsPerPageChange={(e) =>
                        onPaginationModelChange?.({ page: 0, pageSize: parseInt(e.target.value, 10) })
                    }
                    rowsPerPageOptions={[25, 50, 100]}
                    labelRowsPerPage=""
                    sx={{
                        '& .MuiTablePagination-selectLabel': { display: 'none' },
                        '& .MuiInputBase-root': { display: 'none' },
                        '& .MuiTablePagination-displayedRows': { fontSize: 12 },
                    }}
                />
            </Box>
        </Box>
    );
}
