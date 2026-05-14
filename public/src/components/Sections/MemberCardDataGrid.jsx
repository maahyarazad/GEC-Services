import { useEffect, useState, useCallback, useRef } from 'react';
import CustomDataGrid from '../CustomDataGrid';
import { useAlertDialog } from '../Providers/AlertProvider';
import { useSnackbar } from '../Providers/Snackbar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import DashboardCards from '../Dashboard/Dashboard/DashboardCards';
import { MdWorkspacePremium } from "react-icons/md";
import { BsFiletypeCsv } from "react-icons/bs";
import { GrVirtualMachine } from "react-icons/gr";
import Modal from '../Modal';
import { IconButton } from '@mui/material';
import { FaUsersViewfinder } from "react-icons/fa6";
import { SiMinutemailer } from "react-icons/si";

const paidBlue = '#0f0faf';
const nonpaidBlue = '#55729e';
const red = '#cc0000';

const columns = ({ onResendPasswordReset: _onResendPasswordReset, loadingRowId: _loadingRowId, onSendInvitationEmail }) => [
    { field: 'id', headerName: 'ID', width: 70 },
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

const MemberCardDataGrid = () => {
    const [loadingRowId, setLoadingRowId] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewStatus, setViewStatus] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [rowCount, setRowCount] = useState(0);
    const [sortModel, setSortModel] = useState([{ field: 'id', sort: 'desc' }]);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
    const [filterItems, setFilterItems] = useState([]);
    const [debouncedFilterItems, setDebouncedFilterItems] = useState([]);
    const filterSentRef = useRef([]);

    const { openDialog } = useAlertDialog();
    const { showSnackbar } = useSnackbar();

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

    // Smart debounce — only fires when effective filter values change
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
        fetchData(paginationModel, sortModel, debouncedFilterItems);
    }, [paginationModel, sortModel, debouncedFilterItems]);

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

    return (
        <Box sx={{ padding: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                <Button
                    variant="outlined"
                    startIcon={<BsFiletypeCsv size={20} />}
                    onClick={handleExport}
                    sx={{ fontSize: 13, color: 'primary.main', textTransform: 'none', wordBreak: 'break-all' }}
                >
                    {isDownloading ? <CircularProgress size={20} color="inherit" /> : 'Download (All Records) CSV'}
                </Button>

                <IconButton title='View MemberShip Status' onClick={() => setViewStatus(true)} style={{ padding: 0, margin: 0 }}>
                    <FaUsersViewfinder size={30} />
                </IconButton>
            </Box>

            <Box sx={{ width: '100%', height: { xs: '60vh', md: 'calc(100vh - 175px)' } }}>
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
            </Box>

            <Modal
                isOpen={viewStatus}
                onRequestClose={() => setViewStatus(false)}
                title="MemberShip Status"
            >
                <DashboardCards />
            </Modal>
        </Box>
    );
};

export default MemberCardDataGrid;
