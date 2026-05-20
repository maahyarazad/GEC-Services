import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import CustomDataGrid from '../CustomDataGrid';
import { useAlertDialog } from '../Providers/AlertProvider';
import { useSnackbar } from '../Providers/Snackbar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { MdWorkspacePremium } from "react-icons/md";
import { BsFiletypeCsv } from "react-icons/bs";
import { GrVirtualMachine } from "react-icons/gr";
import SlideMenu from '../SlideMenu/SlideMenu';
import { IconButton } from '@mui/material';
import { SiMinutemailer } from "react-icons/si";
import { MdPeople } from "react-icons/md";

const paidBlue = '#0f0faf';
const nonpaidBlue = '#55729e';
const red = '#cc0000';

const columns = ({ onResendPasswordReset: _onResendPasswordReset, loadingRowId: _loadingRowId, onSendInvitationEmail }) => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'active', headerName: 'Active', width: 70 },
    {
        field: 'type',
        headerName: 'Type',
        width: 100,
        filterable: true,
        renderCell: (params) => {
            const virtualCard = params.row.serial_number
                ? <Tooltip title={`Virtual Pass Serial Number: ${params.row.serial_number}`}><GrVirtualMachine size={20} style={{ marginRight: 6 }} /></Tooltip>
                : <div style={{ width: 20, height: 20, marginRight: 6 }} />;

            const containerStyle = {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                height: '100%',
            };

            switch (params.row.type) {
                case 7:
                    return <div style={containerStyle}>{virtualCard}<MdWorkspacePremium color={red} size={22} /></div>;
                case 5:
                    return <div style={containerStyle}>{virtualCard}<MdWorkspacePremium color={nonpaidBlue} size={22} /></div>;
                default:
                    return <div style={containerStyle}>{virtualCard}<MdWorkspacePremium color={paidBlue} size={22} /></div>;
            }
        },
    },
    {
        field: '',
        headerName: 'Actions',
        width: 100,
        filterable: false,
        renderCell: (params) => (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                <Tooltip title={`Send invitation email to ${params.row.email}`}>
                    <IconButton onClick={() => onSendInvitationEmail(params.row)}>
                        <SiMinutemailer color={'gray'} size={22} />
                    </IconButton>
                </Tooltip>
            </div>
        ),
    },
    { field: 'card_number', headerName: 'Card Number', width: 100, filterable: true },
    { field: 'partner', headerName: 'Partner', width: 150, filterable: true },
    { field: 'firstname', headerName: 'First Name', width: 150, filterable: true },
    { field: 'lastname', headerName: 'Last Name', width: 150, filterable: true },
    { field: 'card_expiry_date', headerName: 'Card Expiry Date', width: 200, filterable: true },
    { field: 'mobile_number', headerName: 'Mobile Number', width: 180, filterable: true },
    { field: 'email', headerName: 'Email', width: 220, filterable: true },
    { field: 'memberId', headerName: 'Member ID', width: 150, filterable: true },
    { field: 'username', headerName: 'Username', width: 200, filterable: true },
    { field: 'title', headerName: 'Title', width: 120, filterable: true },
    { field: 'gender', headerName: 'Gender', width: 120, filterable: true },
    { field: 'last_login', headerName: 'Last Login', width: 200, filterable: true },
];

const buildFilterParams = (filterItems = []) => {
    const active = filterItems.filter(
        (f) => f.value !== '' || ['isEmpty', 'isNotEmpty'].includes(f.operator)
    );
    if (active.length === 0) return '';
    return active.map((f) =>
        `filterField[]=${encodeURIComponent(f.field)}` +
        `&filterOperator[]=${encodeURIComponent(f.operator)}` +
        `&filterValue[]=${encodeURIComponent(f.value ?? '')}`
    ).join('&');
};

const getEffectiveFilterKey = (items) =>
    items
        .filter((f) => f.value !== '' || ['isEmpty', 'isNotEmpty'].includes(f.operator))
        .map(({ field, operator, value }) => `${field}:${operator}:${value ?? ''}`)
        .sort()
        .join('|');

// ─── Simple searchable mini-table ────────────────────────────────────────────

const MiniTable = ({ title, rows, columns: cols, loading, searchPlaceholder }) => {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search.trim()) return rows;
        const q = search.trim().toLowerCase();
        return rows.filter((r) =>
            cols.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q))
        );
    }, [rows, search, cols]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 175px)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>{title}</Typography>
            <TextField
                size="small"
                placeholder={searchPlaceholder ?? 'Search…'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ mb: 1 }}
                fullWidth
            />
            <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, overflow: 'auto' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : (
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                {cols.map((c) => (
                                    <TableCell key={c.key} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                                        {c.label}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={cols.length} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                                        No data
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((row, i) => (
                                    <TableRow key={i} hover>
                                        {cols.map((c) => (
                                            <TableCell key={c.key} sx={{ whiteSpace: 'nowrap' }}>
                                                {c.render ? c.render(row) : (row[c.key] ?? '—')}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>
        </Box>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

const MemberCardDataGrid = () => {
    const [loadingRowId, setLoadingRowId] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showMembersGrid, setShowMembersGrid] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [rowCount, setRowCount] = useState(0);
    const [sortModel, setSortModel] = useState([{ field: 'id', sort: 'desc' }]);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
    const [filterItems, setFilterItems] = useState([]);
    const [debouncedFilterItems, setDebouncedFilterItems] = useState([]);
    const filterSentRef = useRef([]);

    // Partner stats (left table)
    const [partnerStats, setPartnerStats] = useState([]);
    const [partnerStatsLoading, setPartnerStatsLoading] = useState(false);
    const [syncingPartner, setSyncingPartner] = useState(null);

    // GEC grouped partners (right table)
    const [gecPartners, setGecPartners] = useState([]);
    const [gecLoading, setGecLoading] = useState(false);

    const { openDialog } = useAlertDialog();
    const { showSnackbar } = useSnackbar();

    // ─── Partner stats fetch ─────────────────────────────────────────────────

    const fetchPartnerStats = useCallback(async () => {
        setPartnerStatsLoading(true);
        try {
            const r = await fetch(`${import.meta.env.VITE_SERVERURL}/api/member-card-partner-stats`, { credentials: 'include' });
            const d = await r.json();
            setPartnerStats(d.data ?? []);
        } catch (e) {
            console.error('partner stats fetch failed', e);
        } finally {
            setPartnerStatsLoading(false);
        }
    }, []);

    useEffect(() => { fetchPartnerStats(); }, [fetchPartnerStats]);

    // ─── GEC grouped partners fetch ──────────────────────────────────────────

    const fetchGecPartners = useCallback(async () => {
        setGecLoading(true);
        try {
            const r = await fetch(`${import.meta.env.VITE_SERVERURL}/api/gec-grouped-partners`, { credentials: 'include' });
            const d = await r.json();
            setGecPartners(d.data ?? []);
        } catch (e) {
            console.error('GEC partners fetch failed', e);
        } finally {
            setGecLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGecPartners();
    }, [fetchGecPartners]);

    // ─── Right-table rows: GEC partners + local-only rows with chip ──────────

    const rightTableRows = useMemo(() => {
        const statsTitles = new Set(partnerStats.map((s) => (s.partner ?? '').toLowerCase().trim()));
        const gecOnlyPartners = gecPartners
            .filter((p) => !statsTitles.has((p.group_name ?? '').toLowerCase().trim()))
            .map((p) => ({ ...p, _notInServices: true }));
        return [...partnerStats.map((s) => ({ group_name: s.partner, member_count: s.member_count, _notInServices: false })), ...gecOnlyPartners];
    }, [gecPartners, partnerStats]);

    const summaryStats = useMemo(() => {
        const inServices = rightTableRows.filter((r) => !r._notInServices).length;
        const notInServices = rightTableRows.filter((r) => r._notInServices).length;
        const totalMembers = partnerStats.reduce((sum, s) => sum + (Number(s.member_count) || 0), 0);
        return { inServices, notInServices, totalMembers };
    }, [rightTableRows, partnerStats]);

    const handleSync = async (partner) => {
        setSyncingPartner(partner);
        try {
            const r = await fetch(`${import.meta.env.VITE_SERVERURL}/api/member-card-sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ partner }),
            });
            const d = await r.json();
            if (d.status) {
                showSnackbar(`Synced "${partner}": ${d.updated} updated, ${d.inserted} inserted, ${d.deactivated} deactivated`);
                fetchPartnerStats();
            } else {
                showSnackbar(`Sync failed: ${d.message}`);
            }
        } catch (e) {
            console.error('Sync failed', e);
            showSnackbar('Sync failed — check console');
        } finally {
            setSyncingPartner(null);
        }
    };

    const leftCols = [
        { key: 'partner', label: 'Partner' },
        { key: 'member_count', label: 'Members' },
        { key: 'available_update', label: 'Available Update' },
        {
            key: '_sync',
            label: '',
            render: (row) =>
                row.available_update > 0 ? (
                    <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        disabled={syncingPartner === row.partner}
                        onClick={() => handleSync(row.partner)}
                        sx={{ fontSize: 11, textTransform: 'none', whiteSpace: 'nowrap', py: 0 }}
                    >
                        {syncingPartner === row.partner ? <CircularProgress size={14} color="inherit" /> : 'Sync'}
                    </Button>
                ) : null,
        },
    ];

    const rightCols = [
        { key: 'group_name', label: 'Partner (GEC)' },
        {
            key: '_notInServices',
            label: 'Status',
            render: (row) =>
                row._notInServices ? (
                    <Chip label="Not in Services" size="small" color="warning" variant="outlined" sx={{ fontSize: 11 }} />
                ) : (
                    <Chip label="In Services" size="small" color="success" variant="outlined" sx={{ fontSize: 11 }} />
                ),
        },
    ];

    // ─── Members DataGrid logic ──────────────────────────────────────────────

    const fetchData = useCallback(async (pagination, sort, filters) => {
        setLoading(true);
        try {
            const { field: sortField = '', sort: sortOrder = '' } = (sort ?? [])[0] ?? {};
            const filterParams = buildFilterParams(filters ?? []);

            const queryParams = [
                `page=${(pagination?.page ?? 0) + 1}`,
                `pageSize=${pagination?.pageSize ?? 25}`,
                sortField ? `sortField=${sortField}` : '',
                sortOrder ? `sortOrder=${sortOrder}` : '',
                filterParams,
            ].filter(Boolean).join('&');

            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/member_card?${queryParams}`,
                { credentials: 'include' }
            );
            const data = await response.json();
            setMembers(data.data || []);
            setRowCount(data.total || 0);
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            const currentKey = getEffectiveFilterKey(filterItems);
            const sentKey = getEffectiveFilterKey(filterSentRef.current);
            if (currentKey === sentKey) return;
            filterSentRef.current = filterItems;
            setDebouncedFilterItems(filterItems);
            setPaginationModel((prev) => ({ ...prev, page: 0 }));
        }, 400);
        return () => clearTimeout(timer);
    }, [filterItems]);

    useEffect(() => {
        if (!showMembersGrid) return;
        fetchData(paginationModel, sortModel, debouncedFilterItems);
    }, [paginationModel, sortModel, debouncedFilterItems, showMembersGrid]);

    // ─── Handlers ────────────────────────────────────────────────────────────

    const confirmSendInvitationEmail = (member_data) => {
        openDialog(
            <>Are you sure you want to send an invitation email to <strong>{member_data?.email || 'this member'}</strong>?</>,
            'Send Invitation Email',
            { text: 'Send', color: 'primary' },
            () => handleSendInvitationEmail(member_data),
            () => {}
        );
    };

    const handleSendInvitationEmail = async (member_data) => {
        try {
            setLoadingRowId(member_data.id);
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/send-invitation-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ data: member_data }),
            });
            const data = await response.json();
            showSnackbar(data.message);
            if (!response.ok) throw new Error(data.message);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoadingRowId(null);
        }
    };

    const handleResetPassword = async (row) => {
        try {
            setLoadingRowId(row.id);
            await fetch(`${import.meta.env.VITE_SERVERURL}/api/gic-user/send-reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: row.email }),
            });
        } catch (error) {
            console.error('Error resetting password:', error);
        } finally {
            setLoadingRowId(null);
        }
    };

    const handleExport = async () => {
        try {
            setIsDownloading(true);
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/member-card-csv-data`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch CSV file');

            const contentDisposition = response.headers.get('Content-Disposition');
            let fileName = 'download.csv';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match) fileName = match[1];
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed', error);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleOpenMembersGrid = () => {
        setShowMembersGrid(true);
        fetchData(paginationModel, sortModel, debouncedFilterItems);
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <Box sx={{ padding: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>

            {/* Top action bar */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1, alignItems: 'center' }}>
                <Button
                    variant="contained"
                    startIcon={<MdPeople size={20} />}
                    onClick={handleOpenMembersGrid}
                    sx={{ fontSize: 13, textTransform: 'none' }}
                >
                    Corporate Members
                </Button>

                <Button
                    variant="outlined"
                    disabled
                    sx={{ fontSize: 13, textTransform: 'none' }}
                >
                    Sync All — Under Development
                </Button>

                <Button
                    variant="outlined"
                    startIcon={<BsFiletypeCsv size={20} />}
                    onClick={handleExport}
                    sx={{ fontSize: 13, color: 'primary.main', textTransform: 'none' }}
                >
                    {isDownloading ? <CircularProgress size={20} color="inherit" /> : 'Download CSV'}
                </Button>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip
                        label={`Legacy Partners In Services: ${summaryStats.inServices}`}
                        size="small"
                        color="success"
                        variant="outlined"
                    />
                    <Chip
                        label={`Not in Services: ${summaryStats.notInServices}`}
                        size="small"
                        color="warning"
                        variant="outlined"
                    />
                    <Chip
                        label={`Total Members (Local DB): ${summaryStats.totalMembers.toLocaleString()}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                    />
                </Box>
            </Box>

            {/* Two-column partner tables */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, flex: 1, minHeight: 0 }}>

                {/* Left — Local DB partner stats */}
                <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <MiniTable
                        title="Partner Member Counts (Local DB)"
                        rows={partnerStats}
                        columns={leftCols}
                        loading={partnerStatsLoading}
                        searchPlaceholder="Search partner…"
                    />
                </Box>

                {/* Right — GEC grouped partners + chip indicators */}
                <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <MiniTable
                        title="Legacy Admin Partners"
                        rows={rightTableRows}
                        columns={rightCols}
                        loading={gecLoading || partnerStatsLoading}
                        searchPlaceholder="Search GEC partner…"
                    />
                </Box>
            </Box>

            {/* Corporate Members DataGrid slide menu */}
            <SlideMenu
                isOpen={showMembersGrid}
                onClose={() => setShowMembersGrid(false)}
                headerTitle="Corporate Members"
            >
                <div style={{ width: '100%', height: 'calc(100vh - 125px)' }}>
                    <CustomDataGrid
                        rows={members}
                        columns={columns({ onResendPasswordReset: handleResetPassword, loadingRowId, onSendInvitationEmail: confirmSendInvitationEmail })}
                        loading={loading}
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
                        onFilterItemsChange={setFilterItems}

                        disableRowSelectionOnClick
                    />
                </div>
            </SlideMenu>

        </Box>
    );
};

export default MemberCardDataGrid;
