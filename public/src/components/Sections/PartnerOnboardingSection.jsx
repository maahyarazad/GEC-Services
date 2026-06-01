import { useEffect, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { BsFiletypeCsv } from 'react-icons/bs';
import { RiEditLine } from 'react-icons/ri';
import { TbTrashX } from 'react-icons/tb';
import { MdPersonAdd } from 'react-icons/md';

import CustomDataGrid from '../CustomDataGrid';
import { useAlertDialog } from '../Providers/AlertProvider';
import { useSnackbar } from '../Providers/Snackbar';
import { useSlideModal } from '../Providers/SlideModalProvider';
import { config } from '../../ui_config';

// ─── Employee Form ────────────────────────────────────────────────────────────

const EMPTY_FORM = {
    title: '', firstname: '', lastname: '', gender: '',
    mobile_number: '', email: '', partner: '', birthday: '', language: 'en',
};

function EmployeeForm({ initial, onSubmit, loading }) {
    const [form, setForm] = useState(initial || EMPTY_FORM);
    const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

    const required = !form.firstname.trim() || !form.lastname.trim() || !form.email.trim() || !form.partner.trim();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField select label="Title" value={form.title} onChange={(e) => set('title', e.target.value)} size="small" sx={{ width: 110 }}>
                    {['', 'Mr.', 'Ms.', 'Mrs.', 'Dr.'].map((t) => <MenuItem key={t} value={t}>{t || '—'}</MenuItem>)}
                </TextField>
                <TextField select label="Gender" value={form.gender} onChange={(e) => set('gender', e.target.value)} size="small" sx={{ width: 110 }}>
                    {[['', '—'], ['m', 'Male'], ['f', 'Female']].map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </TextField>
                <TextField select label="Language" value={form.language} onChange={(e) => set('language', e.target.value)} size="small" sx={{ width: 110 }}>
                    <MenuItem value="en">EN</MenuItem>
                    <MenuItem value="de">DE</MenuItem>
                </TextField>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField required fullWidth label="First Name" value={form.firstname} onChange={(e) => set('firstname', e.target.value)} size="small" />
                <TextField required fullWidth label="Last Name" value={form.lastname} onChange={(e) => set('lastname', e.target.value)} size="small" />
            </Box>
            <TextField required fullWidth label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} size="small" />
            <TextField fullWidth label="Mobile Number" value={form.mobile_number} onChange={(e) => set('mobile_number', e.target.value)} size="small" />
            <TextField required fullWidth label="Partner" value={form.partner} onChange={(e) => set('partner', e.target.value)} size="small" />
            <TextField fullWidth label="Birthday" type="date" value={form.birthday ? form.birthday.slice(0, 10) : ''} onChange={(e) => set('birthday', e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
            <Button
                variant="contained"
                disabled={required || loading}
                onClick={() => onSubmit(form)}
                sx={{ mt: 1, textTransform: 'none' }}
            >
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Save'}
            </Button>
        </Box>
    );
}

// ─── Column definitions ───────────────────────────────────────────────────────

const getColumns = ({ onEdit, onDelete }) => [
    { field: 'id', headerName: 'ID', width: 60 },
    {
        field: 'actions',
        headerName: 'Actions',
        width: 90,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
            <Box>
                <Tooltip title="Edit" componentsProps={config.tooltip_config}>
                    <IconButton size="small" onClick={() => onEdit(params.row)} sx={{ color: '#1976d2', '&:hover': { backgroundColor: '#e3f2fd' } }}>
                        <RiEditLine size={20} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete" componentsProps={config.tooltip_config}>
                    <IconButton size="small" onClick={() => onDelete(params.row)} sx={{ color: '#d32f2f', '&:hover': { backgroundColor: '#ffebee' } }}>
                        <TbTrashX size={20} />
                    </IconButton>
                </Tooltip>
            </Box>
        ),
    },
    {
        field: 'title',
        headerName: 'Title',
        width: 80,
        filterable: true,
        renderCell: (params) => params?.row?.title || '—',
    },
    {
        field: 'firstname',
        headerName: 'First Name',
        width: 130,
        filterable: true,
    },
    {
        field: 'lastname',
        headerName: 'Last Name',
        width: 130,
        filterable: true,
    },
    {
        field: 'gender',
        headerName: 'Gender',
        width: 90,
        filterable: true,
        renderCell: (params) => {
            const g = params?.row?.gender;
            if (!g) return '—';
            const label = g === 'm' ? 'Male' : g === 'f' ? 'Female' : g;
            return (
                <Chip
                    label={label}
                    size="small"
                    color={g === 'm' ? 'info' : 'secondary'}
                    variant="outlined"
                    sx={{ fontSize: 11 }}
                />
            );
        },
    },
    {
        field: 'mobile_number',
        headerName: 'Mobile',
        width: 150,
        filterable: true,
    },
    {
        field: 'email',
        headerName: 'Email',
        width: 200,
        filterable: true,
    },
    {
        field: 'partner',
        headerName: 'Partner',
        width: 150,
        filterable: true,
        renderCell: (params) => params?.row?.partner || '—',
    },
    {
        field: 'birthday',
        headerName: 'Birthday',
        width: 120,
        filterable: true,
        renderCell: (params) => {
            const bday = params?.row?.birthday;
            if (!bday) return '—';
            try {
                return new Date(bday).toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' });
            } catch { return bday; }
        },
    },
    {
        field: 'language',
        headerName: 'Language',
        width: 100,
        filterable: true,
        renderCell: (params) => {
            const lang = params?.row?.language;
            if (!lang) return '—';
            return <span style={{ fontSize: 13 }}>{lang === 'en' ? '🇬🇧 EN' : lang === 'de' ? '🇩🇪 DE' : lang}</span>;
        },
    },
    {
        field: 'metadata_createdAt',
        headerName: 'Created At',
        width: 170,
        filterable: true,
        renderCell: (params) => {
            const ts = params?.row?.metadata_createdAt;
            if (!ts) return '—';
            try {
                return new Date(ts).toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            } catch { return ts; }
        },
    },
    {
        field: 'member_card_id',
        headerName: 'Member Card',
        width: 140,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
            const cardId = params?.row?.member_card_id;
            return cardId != null ? (
                <Chip label="Matched" size="small" color="success" variant="filled" sx={{ fontSize: 11, fontWeight: 600 }} />
            ) : (
                <Chip label="No Match" size="small" color="default" variant="outlined" sx={{ fontSize: 11 }} />
            );
        },
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFilterParams(filterItems = []) {
    const active = filterItems.filter(
        (f) => f.value !== '' || ['isEmpty', 'isNotEmpty'].includes(f.operator)
    );
    if (active.length === 0) return '';

    return active
        .map(
            (f) =>
                `filterField[]=${encodeURIComponent(f.field)}` +
                `&filterOperator[]=${encodeURIComponent(f.operator)}` +
                `&filterValue[]=${encodeURIComponent(f.value ?? '')}`
        )
        .join('&');
}

// ─── Component ────────────────────────────────────────────────────────────────

const PartnerOnboardingSection = () => {
    const defaultSortModel = [{ field: 'id', sort: 'desc' }];

    const { openDialog } = useAlertDialog();
    const { showSnackbar } = useSnackbar();
    const { openModal, closeModal } = useSlideModal();

    const [registrationList, setRegistrationList] = useState([]);
    const [loading,          setLoading]          = useState(false);
    const [isDownloading,    setIsDownloading]    = useState(false);
    const [formLoading,      setFormLoading]      = useState(false);
    const [rowCount,         setRowCount]         = useState(0);
    const [sortModel,        setSortModel]        = useState(defaultSortModel);
    const [paginationModel,  setPaginationModel]  = useState({ page: 0, pageSize: 25 });
    const [filterItems,      setFilterItems]      = useState([]);

    // ─── Fetch ────────────────────────────────────────────────────────────────

    const fetchData = useCallback(async (pagination, sort = [], filters = []) => {
        setLoading(true);
        try {
            const { field: sortField = '', sort: sortOrder = '' } = sort[0] ?? {};
            const filterParams = buildFilterParams(filters);

            const queryParams = [
                `page=${pagination.page + 1}`,
                `pageSize=${pagination.pageSize}`,
                sortField  ? `sortField=${sortField}`   : '',
                sortOrder  ? `sortOrder=${sortOrder}`   : '',
                filterParams,
            ].filter(Boolean).join('&');

            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/partner-onboarding?${queryParams}`,
                { credentials: 'include' }
            );
            const response_data = await response.json();

            setRegistrationList(response_data.data  || []);
            setRowCount(        response_data.total || 0);
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(paginationModel, sortModel, filterItems);
    }, [paginationModel, sortModel, filterItems]);

    // ─── ADD ──────────────────────────────────────────────────────────────────

    const handleAdd = () => {
        openModal('Add Employee',
            <EmployeeForm
                loading={formLoading}
                onSubmit={async (form) => {
                    setFormLoading(true);
                    try {
                        const res = await fetch(`${import.meta.env.VITE_SERVERURL}/api/partner-onboarding/employee`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(form),
                        });
                        const data = await res.json();
                        if (!res.ok) { showSnackbar(data.message || 'Failed to add employee', 'error'); return; }
                        showSnackbar('Employee added', 'success');
                        closeModal();
                        fetchData(paginationModel, sortModel, filterItems);
                    } catch (err) {
                        showSnackbar(err.message || 'Network error', 'error');
                    } finally {
                        setFormLoading(false);
                    }
                }}
            />
        );
    };

    // ─── EDIT ─────────────────────────────────────────────────────────────────

    const handleEdit = (row) => {
        openModal(`Edit — ${row.firstname} ${row.lastname}`,
            <EmployeeForm
                initial={row}
                loading={formLoading}
                onSubmit={async (form) => {
                    setFormLoading(true);
                    try {
                        const res = await fetch(`${import.meta.env.VITE_SERVERURL}/api/partner-onboarding/employee/${row.id}`, {
                            method: 'PUT',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(form),
                        });
                        const data = await res.json();
                        if (!res.ok) { showSnackbar(data.message || 'Failed to update employee', 'error'); return; }
                        showSnackbar('Employee updated', 'success');
                        closeModal();
                        fetchData(paginationModel, sortModel, filterItems);
                    } catch (err) {
                        showSnackbar(err.message || 'Network error', 'error');
                    } finally {
                        setFormLoading(false);
                    }
                }}
            />
        );
    };

    // ─── DELETE ───────────────────────────────────────────────────────────────

    const handleDelete = (row) => {
        openDialog(
            <>Do you want to <strong>delete {row.firstname} {row.lastname}</strong> from the database? This cannot be undone.</>,
            'Confirm Delete',
            { text: 'Delete', color: 'error' },
            async () => {
                try {
                    const res = await fetch(`${import.meta.env.VITE_SERVERURL}/api/partner-onboarding/employee/${row.id}`, {
                        method: 'DELETE',
                        credentials: 'include',
                    });
                    const data = await res.json();
                    if (!res.ok) { showSnackbar(data.message || 'Failed to delete', 'error'); return; }
                    showSnackbar('Employee deleted', 'success');
                    fetchData(paginationModel, sortModel, filterItems);
                } catch (err) {
                    showSnackbar(err.message || 'Network error', 'error');
                }
            },
            () => {},
        );
    };

    // ─── Filters ──────────────────────────────────────────────────────────────

    const handleFilterItemsChange = (newItems) => {
        setFilterItems(newItems);
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
    };

    // ─── Export ───────────────────────────────────────────────────────────────

    const handleExport = async () => {
        try {
            setIsDownloading(true);
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/registration-csv-data`,
                { credentials: 'include' }
            );
            if (!response.ok) throw new Error('Failed to fetch CSV file');

            const contentDisposition = response.headers.get('Content-Disposition');
            let fileName = 'download.csv';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match) fileName = match[1];
            }

            const blob = await response.blob();
            const url  = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href  = url;
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

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <Box sx={{ padding: 1 }}>

            {/* Top buttons row */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                <Button
                    variant="contained"
                    startIcon={<MdPersonAdd size={18} />}
                    onClick={handleAdd}
                    sx={{ fontSize: 13, textTransform: 'none' }}
                >
                    Add Employee
                </Button>
                <Button
                    variant='outlined'
                    startIcon={<BsFiletypeCsv size={20} />}
                    onClick={handleExport}
                    sx={{ fontSize: 13, color: 'primary.main', textTransform: 'none' }}
                >
                    {isDownloading
                        ? <CircularProgress size={20} color='inherit' />
                        : 'Download (All Records) CSV'}
                </Button>
            </Box>

            {/* Main content: datagrid */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1, minWidth: 0, width: '100%', height: { xs: '60vh', md: 'calc(100vh - 175px)' } }}>
                    <CustomDataGrid
                        rows={registrationList}
                        columns={getColumns({ onEdit: handleEdit, onDelete: handleDelete })}
                        loading={loading}
                        showToolbar

                        filterMode='server'
                        sortingMode='server'
                        paginationMode='server'

                        rowCount={rowCount}
                        paginationModel={paginationModel}
                        onPaginationModelChange={(newModel) => setPaginationModel(newModel)}
                        rowsPerPageOptions={[25, 50, 100, 500]}

                        sortModel={sortModel}
                        onSortModelChange={(newModel) => setSortModel(newModel)}

                        filterItems={filterItems}
                        onFilterItemsChange={handleFilterItemsChange}

                        disableRowSelectionOnClick
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default PartnerOnboardingSection;
