import { useEffect, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';

import { BsFiletypeCsv } from 'react-icons/bs';

import CustomDataGrid from '../CustomDataGrid';

// ─── Column definitions ───────────────────────────────────────────────────────

const columns = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'title', headerName: 'Title', width: 80, filterable: true, renderCell: (p) => p?.row?.title || '—' },
    { field: 'firstname', headerName: 'First Name', width: 130, filterable: true },
    { field: 'lastname', headerName: 'Last Name', width: 130, filterable: true },
    {
        field: 'gender', headerName: 'Gender', width: 90, filterable: true,
        renderCell: (p) => {
            const g = p?.row?.gender;
            if (!g) return '—';
            return <Chip label={g === 'm' ? 'Male' : g === 'f' ? 'Female' : g} size="small" color={g === 'm' ? 'info' : 'secondary'} variant="outlined" sx={{ fontSize: 11 }} />;
        },
    },
    { field: 'mobile_number', headerName: 'Mobile', width: 150, filterable: true },
    { field: 'email', headerName: 'Email', width: 200, filterable: true },
    { field: 'partner', headerName: 'Partner', width: 150, filterable: true, renderCell: (p) => p?.row?.partner || '—' },
    {
        field: 'birthday', headerName: 'Birthday', width: 120, filterable: true,
        renderCell: (p) => {
            const b = p?.row?.birthday;
            if (!b) return '—';
            try { return new Date(b).toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' }); } catch { return b; }
        },
    },
    {
        field: 'language', headerName: 'Language', width: 100, filterable: true,
        renderCell: (p) => {
            const l = p?.row?.language;
            if (!l) return '—';
            return <span style={{ fontSize: 13 }}>{l === 'en' ? '🇬🇧 EN' : l === 'de' ? '🇩🇪 DE' : l}</span>;
        },
    },
    {
        field: 'action_type', headerName: 'Action', width: 90, filterable: true,
        renderCell: (p) => {
            const a = p?.row?.action_type || 'add';
            const map = { add: ['success', 'Add'], update: ['info', 'Update'], delete: ['error', 'Delete'] };
            const [color, label] = map[a] ?? ['default', a];
            return <Chip label={label} size="small" color={color} variant="outlined" sx={{ fontSize: 11 }} />;
        },
    },
    {
        field: 'synchronized', headerName: 'Synced', width: 100, filterable: false, sortable: false,
        renderCell: (p) => {
            const s = p?.row?.synchronized;
            return (s === 1 || s === true)
                ? <Chip label="Synced" size="small" color="success" variant="filled" sx={{ fontSize: 11, fontWeight: 600 }} />
                : <Chip label="Pending" size="small" color="warning" variant="outlined" sx={{ fontSize: 11 }} />;
        },
    },
    {
        field: 'metadata_createdAt', headerName: 'Created At', width: 170, filterable: true,
        renderCell: (p) => {
            const ts = p?.row?.metadata_createdAt;
            if (!ts) return '—';
            try { return new Date(ts).toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ts; }
        },
    },
    {
        field: 'member_card_id', headerName: 'Member Card', width: 140, sortable: false, filterable: false,
        renderCell: (p) => p?.row?.member_card_id != null
            ? <Chip label="Matched" size="small" color="success" variant="filled" sx={{ fontSize: 11, fontWeight: 600 }} />
            : <Chip label="No Match" size="small" color="default" variant="outlined" sx={{ fontSize: 11 }} />,
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFilterParams(filterItems = []) {
    const active = filterItems.filter(f => f.value !== '' || ['isEmpty', 'isNotEmpty'].includes(f.operator));
    if (active.length === 0) return '';
    return active.map(f =>
        `filterField[]=${encodeURIComponent(f.field)}` +
        `&filterOperator[]=${encodeURIComponent(f.operator)}` +
        `&filterValue[]=${encodeURIComponent(f.value ?? '')}`
    ).join('&');
}

// ─── Component ────────────────────────────────────────────────────────────────

const PartnerOnboardingSection = ({ refreshKey = 0 }) => {
    const [registrationList, setRegistrationList] = useState([]);
    const [loading,          setLoading]          = useState(false);
    const [isDownloading,    setIsDownloading]    = useState(false);
    const [rowCount,         setRowCount]         = useState(0);
    const [sortModel,        setSortModel]        = useState([{ field: 'id', sort: 'desc' }]);
    const [paginationModel,  setPaginationModel]  = useState({ page: 0, pageSize: 25 });
    const [filterItems,      setFilterItems]      = useState([]);
    const [showSynced,       setShowSynced]       = useState(false);

    const fetchData = useCallback(async (pagination, sort = [], filters = [], synced = false) => {
        setLoading(true);
        try {
            const { field: sortField = '', sort: sortOrder = '' } = sort[0] ?? {};
            const queryParams = [
                `page=${pagination.page + 1}`,
                `pageSize=${pagination.pageSize}`,
                sortField  ? `sortField=${sortField}` : '',
                sortOrder  ? `sortOrder=${sortOrder}` : '',
                buildFilterParams(filters),
                `synchronized=${synced}`,
            ].filter(Boolean).join('&');

            const res = await fetch(`${import.meta.env.VITE_SERVERURL}/api/partner-onboarding?${queryParams}`, { credentials: 'include' });
            const d = await res.json();
            setRegistrationList(d.data  || []);
            setRowCount(        d.total || 0);
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(paginationModel, sortModel, filterItems, showSynced); }, [paginationModel, sortModel, filterItems, showSynced, refreshKey]);

    const handleExport = async () => {
        try {
            setIsDownloading(true);
            const res = await fetch(`${import.meta.env.VITE_SERVERURL}/api/registration-csv-data`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch CSV');
            const cd = res.headers.get('Content-Disposition');
            const fileName = cd?.match(/filename="?([^"]+)"?/)?.[1] ?? 'download.csv';
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.setAttribute('download', fileName);
            document.body.appendChild(a); a.click(); a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed', err);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <Box sx={{ padding: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button variant="outlined" startIcon={<BsFiletypeCsv size={20} />} onClick={handleExport}
                    sx={{ fontSize: 13, color: 'primary.main', textTransform: 'none' }}>
                    {isDownloading ? <CircularProgress size={20} color="inherit" /> : 'Download (All Records) CSV'}
                </Button>
                <Button
                    variant={showSynced ? 'contained' : 'outlined'}
                    color="success"
                    onClick={() => { setShowSynced(s => !s); setPaginationModel(p => ({ ...p, page: 0 })); }}
                    sx={{ fontSize: 13, textTransform: 'none' }}
                >
                    {showSynced ? 'Showing All' : 'Pending Only'}
                </Button>
            </Box>

            <Box sx={{ height: { xs: '60vh', md: 'calc(100vh - 175px)' } }}>
                <CustomDataGrid
                    rows={registrationList} columns={columns} loading={loading} showToolbar
                    filterMode="server" sortingMode="server" paginationMode="server"
                    rowCount={rowCount}
                    paginationModel={paginationModel}
                    onPaginationModelChange={(m) => setPaginationModel(m)}
                    rowsPerPageOptions={[25, 50, 100, 500]}
                    sortModel={sortModel} onSortModelChange={(m) => setSortModel(m)}
                    filterItems={filterItems} onFilterItemsChange={(items) => { setFilterItems(items); setPaginationModel(p => ({ ...p, page: 0 })); }}
                    disableRowSelectionOnClick
                />
            </Box>
        </Box>
    );
};

export default PartnerOnboardingSection;
