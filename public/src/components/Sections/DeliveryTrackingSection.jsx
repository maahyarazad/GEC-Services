import { useEffect, useState, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import CustomDataGrid from '../CustomDataGrid';
import { useSnackbar } from '../Providers/Snackbar';

// ─── Column definitions (mirrors PartnerOnboardingSection) ───────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildFilterParams(filterItems = []) {
    const active = filterItems.filter(f => f.value !== '' || ['isEmpty', 'isNotEmpty'].includes(f.operator));
    if (active.length === 0) return '';
    return active.map(f =>
        `filterField[]=${encodeURIComponent(f.field)}` +
        `&filterOperator[]=${encodeURIComponent(f.operator)}` +
        `&filterValue[]=${encodeURIComponent(f.value ?? '')}`
    ).join('&');
}

// ─── Delivery Info Card ───────────────────────────────────────────────────────

function DeliveryInfoCard({ info, loading }) {
    if (loading) return <Box sx={{ p: 2 }}><CircularProgress size={20} /></Box>;
    if (!info) return (
        <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">No delivery info found for this partner.</Typography>
        </Box>
    );
    const fields = [
        { label: 'Partner', value: info.partner },
        { label: 'Delivery Address', value: info.delivery_address },
        { label: 'Contact Person', value: info.contact_person },
        { label: 'Phone Number', value: info.phone_number },
        { label: 'Last Updated', value: info.updated_at ? new Date(info.updated_at).toLocaleString() : null },
    ];
    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, p: 2 }}>
            {fields.map(({ label, value }) => (
                <Box key={label}>
                    <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                    <Typography variant="body2" fontWeight={value ? 600 : 400}>{value || '—'}</Typography>
                </Box>
            ))}
        </Box>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

const DeliveryTrackingSection = () => {
    // ── Partner list state ─────────────────────────────────────────────────────
    const [gecPartners, setGecPartners] = useState([]);
    const [partnerStats, setPartnerStats] = useState([]);
    const [pendingCounts, setPendingCounts] = useState({});
    const [partnersWithDelivery, setPartnersWithDelivery] = useState(new Set());
    const [partnersLoading, setPartnersLoading] = useState(false);
    const [search, setSearch] = useState('');

    // ── Selected partner ───────────────────────────────────────────────────────
    const [selectedPartner, setSelectedPartner] = useState(null);

    // ── Sync state ────────────────────────────────────────────────────────────
    const [syncing, setSyncing] = useState(false);

    const { showSnackbar } = useSnackbar();

    // ── Delivery info state ────────────────────────────────────────────────────
    const [deliveryInfo, setDeliveryInfo] = useState(null);
    const [deliveryLoading, setDeliveryLoading] = useState(false);

    // ── DataGrid state ─────────────────────────────────────────────────────────
    const [rows, setRows] = useState([]);
    const [gridLoading, setGridLoading] = useState(false);
    const [rowCount, setRowCount] = useState(0);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState([{ field: 'id', sort: 'desc' }]);
    const [filterItems, setFilterItems] = useState([]);
    const [showSynced, setShowSynced] = useState(true);

    // ── Fetch partner lists ────────────────────────────────────────────────────

    useEffect(() => {
        setPartnersLoading(true);
        Promise.all([
            fetch(`${import.meta.env.VITE_SERVERURL}/api/gec-grouped-partners`, { credentials: 'include' }).then(r => r.json()),
            fetch(`${import.meta.env.VITE_SERVERURL}/api/member-card-partner-stats`, { credentials: 'include' }).then(r => r.json()),
            fetch(`${import.meta.env.VITE_SERVERURL}/api/partner-onboarding-pending-counts`, { credentials: 'include' }).then(r => r.json()),
            fetch(`${import.meta.env.VITE_SERVERURL}/api/partners-with-delivery`, { credentials: 'include' }).then(r => r.json()),
        ])
            .then(([gecData, statsData, pendingData, deliveryData]) => {
                setGecPartners(gecData.data ?? []);
                setPartnerStats(statsData.data ?? []);
                const pcMap = {};
                (pendingData.data ?? []).forEach(({ partner, pending_count }) => {
                    pcMap[(partner ?? '').toLowerCase().trim()] = pending_count;
                });
                setPendingCounts(pcMap);
                setPartnersWithDelivery(new Set(deliveryData.data ?? []));
            })
            .catch(console.error)
            .finally(() => setPartnersLoading(false));
    }, []);

    // ── rightTableRows (same logic as MemberCardDataGrid) ─────────────────────

    const rightTableRows = useMemo(() => {
        const statsTitles = new Set(partnerStats.map((s) => (s.partner ?? '').toLowerCase().trim()));
        const gecOnlyPartners = gecPartners
            .filter((p) => !statsTitles.has((p.group_name ?? '').toLowerCase().trim()))
            .map((p) => ({
                group_name: p.group_name,
                _notInServices: true,
                _pendingCount: pendingCounts[(p.group_name ?? '').toLowerCase().trim()] ?? 0,
            }));
        return [
            ...partnerStats.map((s) => ({
                group_name: s.partner,
                _notInServices: false,
                _pendingCount: pendingCounts[(s.partner ?? '').toLowerCase().trim()] ?? 0,
            })),
            ...gecOnlyPartners,
        ];
    }, [gecPartners, partnerStats, pendingCounts]);

    const filteredPartners = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rightTableRows.filter(p =>
            !q || (p.group_name ?? '').toLowerCase().includes(q)
        );
    }, [rightTableRows, search]);

    // ── Partner selection ──────────────────────────────────────────────────────

    const handleSelectPartner = (partnerName) => {
        setSelectedPartner(partnerName);
        setDeliveryInfo(null);
        setRows([]);
        setRowCount(0);
        setPaginationModel({ page: 0, pageSize: 25 });
        setFilterItems([]);

        setDeliveryLoading(true);
        fetch(`${import.meta.env.VITE_SERVERURL}/api/partner-delivery-info?partner=${encodeURIComponent(partnerName)}`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => setDeliveryInfo(d.data ?? null))
            .catch(console.error)
            .finally(() => setDeliveryLoading(false));
    };

    // ── Sync ───────────────────────────────────────────────────────────────────

    const handleSync = async () => {
        if (!selectedPartner) return;
        setSyncing(true);
        try {
            const r = await fetch(`${import.meta.env.VITE_SERVERURL}/api/member-card-sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ partner: selectedPartner, language: 'de' }),
            });
            const d = await r.json();
            if (d.status) {
                showSnackbar(`Synced "${selectedPartner}" (DE): ${d.updated} updated, ${d.inserted} inserted, ${d.deactivated} deactivated`);
                fetchData(selectedPartner, paginationModel, sortModel, filterItems, showSynced);
            } else {
                showSnackbar(`Sync failed: ${d.message}`, 'error');
            }
        } catch (e) {
            console.error('Sync failed', e);
            showSnackbar('Sync failed — check console', 'error');
        } finally {
            setSyncing(false);
        }
    };

    // ── DataGrid fetch ─────────────────────────────────────────────────────────

    const fetchData = useCallback(async (partner, pagination, sort, filters, synced) => {
        if (!partner) return;
        setGridLoading(true);
        try {
            const { field: sortField = '', sort: sortOrder = '' } = sort[0] ?? {};
            const queryParams = [
                `partner=${encodeURIComponent(partner)}`,
                `page=${pagination.page + 1}`,
                `pageSize=${pagination.pageSize}`,
                sortField ? `sortField=${sortField}` : '',
                sortOrder ? `sortOrder=${sortOrder}` : '',
                buildFilterParams(filters),
                `synchronized=${synced}`,
            ].filter(Boolean).join('&');

            const res = await fetch(`${import.meta.env.VITE_SERVERURL}/api/partner-delivery-employees?${queryParams}`, { credentials: 'include' });
            const d = await res.json();
            setRows(d.data || []);
            setRowCount(d.total || 0);
        } catch (err) {
            console.error('Failed to fetch delivery employees:', err);
        } finally {
            setGridLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedPartner) {
            fetchData(selectedPartner, paginationModel, sortModel, filterItems, showSynced);
        }
    }, [selectedPartner, paginationModel, sortModel, filterItems, showSynced, fetchData]);

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <Box sx={{ display: 'flex', height: 'calc(100vh - 115px)', p: 1, gap: 2, overflow: 'hidden' }}>

            {/* Left Panel — 1/4 width */}
            <Box sx={{ width: { xs: '100%', md: '25%' }, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 220 }}>
                <Typography variant="subtitle2" fontWeight={700}>Partners</Typography>
                <TextField
                    size="small"
                    placeholder="Search partner…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    fullWidth
                />
                <Paper variant="outlined" sx={{ flex: 1, overflow: 'auto' }}>
                    {partnersLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        <List dense disablePadding>
                            {filteredPartners.map((p, i) => {
                                const hasDelivery = partnersWithDelivery.has((p.group_name ?? '').toLowerCase().trim());
                                return (
                                    <ListItem key={i} disablePadding divider>
                                        <ListItemButton
                                            selected={selectedPartner === p.group_name}
                                            disabled={!hasDelivery}
                                            onClick={() => hasDelivery && handleSelectPartner(p.group_name)}
                                            sx={{ gap: 1 }}
                                        >
                                            <ListItemText
                                                primary={p.group_name ?? '—'}
                                                slotProps={{ primary: { variant: 'body2', noWrap: true } }}
                                            />
                                            {hasDelivery && (
                                                <Chip label="Delivery" size="small" color="success" variant="outlined" sx={{ fontSize: 10, flexShrink: 0 }} />
                                            )}
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                            {filteredPartners.length === 0 && !partnersLoading && (
                                <ListItem>
                                    <ListItemText primary="No partners found" slotProps={{ primary: { color: 'text.secondary', variant: 'body2' } }} />
                                </ListItem>
                            )}
                        </List>
                    )}
                </Paper>
            </Box>

            {/* Right Panel — 3/4 width */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, overflow: 'hidden' }}>
                {!selectedPartner ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Typography color="text.secondary">Select a partner with delivery data to view tracking information.</Typography>
                    </Box>
                ) : (
                    <>
                        {/* Delivery Info */}
                        <Card variant="outlined" sx={{ flexShrink: 0 }}>
                            <CardContent sx={{ py: '12px !important' }}>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                                    Delivery Location — {selectedPartner}
                                </Typography>
                                <Divider sx={{ mb: 1 }} />
                                <DeliveryInfoCard info={deliveryInfo} loading={deliveryLoading} />
                            </CardContent>
                        </Card>

                        {/* German-Speaking Employees Grid */}
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="subtitle2" fontWeight={700}>
                                    🇩🇪 German-Speaking Employees — {selectedPartner}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="warning"
                                        disabled={syncing}
                                        onClick={handleSync}
                                        sx={{ fontSize: 11, textTransform: 'none', whiteSpace: 'nowrap', py: 0 }}
                                    >
                                        {syncing ? <CircularProgress size={14} color="inherit" /> : 'Sync (DE)'}
                                    </Button>
                                    <Chip
                                        label={showSynced ? 'Showing All' : 'Pending Only'}
                                        size="small"
                                        color={showSynced ? 'default' : 'warning'}
                                        variant={showSynced ? 'outlined' : 'filled'}
                                        onClick={() => { setShowSynced(s => !s); setPaginationModel(p => ({ ...p, page: 0 })); }}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                </Box>
                            </Box>
                            <Box sx={{ flex: 1, minHeight: 0 }}>
                                <CustomDataGrid
                                    rows={rows}
                                    columns={columns}
                                    loading={gridLoading}
                                    showToolbar
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
                                    onFilterItemsChange={(items) => { setFilterItems(items); setPaginationModel(p => ({ ...p, page: 0 })); }}
                                    disableRowSelectionOnClick
                                />
                            </Box>
                        </Box>
                    </>
                )}
            </Box>
        </Box>
    );
};

export default DeliveryTrackingSection;
