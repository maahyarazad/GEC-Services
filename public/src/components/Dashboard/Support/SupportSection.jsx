import { useState, useCallback, useEffect } from 'react';
import {
    Box, Chip, Typography, Button, TextField, MenuItem, Alert,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import CustomDataGrid from '../../CustomDataGrid';
import TicketDetailModal from './TicketDetailModal';

const SERVER_URL = import.meta.env.VITE_SERVERURL;

const STATUS_COLOR   = { 'Open': 'default', 'In Progress': 'info', 'Waiting for Customer': 'warning', 'Resolved': 'success', 'Closed': 'default' };
const PRIORITY_COLOR = { Low: 'default', Medium: 'warning', High: 'error' };

const STATUS_OPTIONS   = ['Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];
const CATEGORY_OPTIONS = ['Bug Report', 'Technical Issue', 'Feature Request', 'Account Issue', 'General Inquiry'];

const columns = [
    { field: 'ticket_number', headerName: 'Ticket #', width: 200, renderCell: ({ value }) => (
        <Typography sx={{ fontFamily: 'monospace', fontSize: 13, color: 'primary.main', fontWeight: 600 }}>{value}</Typography>
    )},
    { field: 'subject',       headerName: 'Subject',   flex: 1, minWidth: 180 },
    { field: 'category',      headerName: 'Category',  width: 160 },
    { field: 'priority',      headerName: 'Priority',  width: 110, renderCell: ({ value }) => (
        <Chip label={value} color={PRIORITY_COLOR[value] ?? 'default'} size="small" />
    )},
    { field: 'status',        headerName: 'Status',    width: 180, renderCell: ({ value }) => (
        <Chip label={value} color={STATUS_COLOR[value] ?? 'default'} size="small" />
    )},
    { field: 'full_name',     headerName: 'Customer',  width: 160 },
    { field: 'created_at',    headerName: 'Created',   width: 160, renderCell: ({ value }) => value ? new Date(value).toLocaleDateString() : '' },
    { field: 'updated_at',    headerName: 'Updated',   width: 160, renderCell: ({ value }) => value ? new Date(value).toLocaleDateString() : '' },
];

export default function SupportSection() {
    const [filters, setFilters]     = useState({ status: '', priority: '', category: '', search: '', dateFrom: '', dateTo: '' });
    const [pagination, setPagination] = useState({ page: 0, pageSize: 25 });
    const [rows, setRows]           = useState([]);
    const [rowCount, setRowCount]   = useState(0);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({
                page:     pagination.page,
                pageSize: pagination.pageSize,
                ...(filters.status   ? { status:   filters.status }   : {}),
                ...(filters.priority ? { priority: filters.priority } : {}),
                ...(filters.category ? { category: filters.category } : {}),
                ...(filters.search   ? { search:   filters.search }   : {}),
                ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
                ...(filters.dateTo   ? { dateTo:   filters.dateTo }   : {}),
            });
            const res  = await fetch(`${SERVER_URL}/api/admin/support/tickets?${params}`, { credentials: 'include' });
            const data = await res.json();
            if (!res.ok || !data.status) { setError(data.message ?? 'Failed to load tickets.'); return; }
            setRows(data.data);
            setRowCount(data.total);
        } catch {
            setError('Network error.');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    const handleFilterChange = (key, value) => {
        setFilters((f) => ({ ...f, [key]: value }));
        setPagination((p) => ({ ...p, page: 0 }));
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <ConfirmationNumberOutlinedIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>Support Tickets</Typography>
                    <Chip label={rowCount} size="small" color="primary" />
                </Box>
                <Button
                    size="small" startIcon={<RefreshIcon />}
                    onClick={() => setRefreshKey((k) => k + 1)}
                    sx={{ textTransform: 'none' }}
                >
                    Refresh
                </Button>
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-end' }}>
                <TextField
                    select label="Status" size="small" sx={{ minWidth: 160 }}
                    value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                    <MenuItem value="">All Statuses</MenuItem>
                    {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
                <TextField
                    select label="Priority" size="small" sx={{ minWidth: 120 }}
                    value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)}
                >
                    <MenuItem value="">All Priorities</MenuItem>
                    {PRIORITY_OPTIONS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </TextField>
                <TextField
                    select label="Category" size="small" sx={{ minWidth: 180 }}
                    value={filters.category} onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                    <MenuItem value="">All Categories</MenuItem>
                    {CATEGORY_OPTIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
                <TextField
                    label="Search" size="small" placeholder="Ticket #, subject, name…" sx={{ minWidth: 220 }}
                    value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)}
                />
                <TextField
                    label="From" type="date" size="small" sx={{ minWidth: 140 }}
                    value={filters.dateFrom} onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    label="To" type="date" size="small" sx={{ minWidth: 140 }}
                    value={filters.dateTo} onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            {/* Grid */}
            <Box sx={{ flex: 1, minHeight: 400 }}>
                <CustomDataGrid
                    columns={columns}
                    rows={rows}
                    rowCount={rowCount}
                    loading={loading}
                    paginationModel={pagination}
                    onPaginationModelChange={setPagination}
                    getRowId={(r) => r.id}
                    onRowClick={(params) => setSelectedId(params.row.id)}
                    sx={{ cursor: 'pointer' }}
                />
            </Box>

            {selectedId && (
                <TicketDetailModal
                    ticketId={selectedId}
                    onClose={() => { setRefreshKey((k) => k + 1); setSelectedId(null); }}
                />
            )}
        </Box>
    );
}
