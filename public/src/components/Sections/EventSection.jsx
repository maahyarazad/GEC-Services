import React, { useEffect, useState, useCallback } from 'react';
import { DataGrid } from '@mui/x-data-grid';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { useSnackbar } from '../Providers/Snackbar';
import { BsFiletypeCsv } from 'react-icons/bs';
import { MdOutlineAddCircleOutline } from 'react-icons/md';
import { FaCog } from 'react-icons/fa';
import FilterParams from '../Dashboard/FilterParams';
import { config } from '../../ui_config';
import { useAppDispatch } from '../../store/hooks';
import { triggerRefetch } from '../../features/eventSlice';
import { RiEditLine } from "react-icons/ri";
import { TbTrashX } from "react-icons/tb";

// ─── helpers ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
    title: '',
    description: '',
    event_date: '',
};

const EMPTY_AUTO_RESPONSE = {
    auto_response_general_de: '',
    auto_response_general_en: '',
    auto_response_guest_de: '',
    auto_response_guest_en: '',
};

// ─── columns ────────────────────────────────────────────────────────────────
const formatDate = (value) => {
    return value ? new Date(value).toLocaleString() : '—';
};

const buildColumns = (onEdit, onDelete, onAutoResponse, onToggleActive, togglingId) => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'title', headerName: 'Title', width: 250, filterable: true },
    { field: 'description', headerName: 'Description', width: 260, filterable: true },
    {
        field: 'event_date',
        headerName: 'Event Date',
        width: 170,
        filterable: true,
        renderCell: (params) => formatDate(params?.row?.event_date),
    },
    {
        field: 'metadata_createdAt',
        headerName: 'Created At',
        width: 170,
        filterable: true,
        renderCell: (params) => formatDate(params?.row?.metadata_createdAt),
    },
    {
        field: 'metadata_modifiedAt',
        headerName: 'Modified At',
        width: 170,
        filterable: true,
        renderCell: (params) => formatDate(params?.row?.metadata_modifiedAt),
    },
    {
        field: '_actions',
        headerName: 'Actions',
        width: 190,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 0.5 }}>
                <Tooltip title="Edit event" componentsProps={config.tooltip_config}>
                    <IconButton size="small" onClick={() => onEdit(params.row)} sx={{ color: '#1976d2', '&:hover': { backgroundColor: '#e3f2fd' } }}>
                        <RiEditLine size={20} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete event" componentsProps={config.tooltip_config}>
                    <IconButton size="small" color="error" onClick={() => onDelete(params.row)} sx={{ color: '#d32f2f', '&:hover': { backgroundColor: '#ffebee' } }}>
                        <TbTrashX size={20} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Auto-response settings" componentsProps={config.tooltip_config}>
                    <IconButton size="small" onClick={() => onAutoResponse(params.row)} sx={{ color: '#555', '&:hover': { backgroundColor: '#f5f5f5' } }}>
                        <FaCog size={18} />
                    </IconButton>
                </Tooltip>
                <Tooltip title={params.row.active_event ? 'Deactivate event' : 'Set as active event'} componentsProps={config.tooltip_config}>
                    <span>
                        {togglingId === params.row.id
                            ? <CircularProgress size={20} sx={{ mx: 0.5 }} />
                            : (
                                <Switch
                                    size="small"
                                    checked={!!params.row.active_event}
                                    onChange={(e) => onToggleActive(params.row, e.target.checked)}
                                    color="success"
                                />
                            )
                        }
                    </span>
                </Tooltip>
            </Box>
        ),
    },
];

// ─── component ──────────────────────────────────────────────────────────────

const EventSection = () => {
    const dispatch = useAppDispatch();
    const defaultSortModel = [{ field: 'id', sort: 'desc' }];
    const { showSnackbar } = useSnackbar();
    const [eventList, setEventList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const [rowCount, setRowCount] = useState(0);
    const [sortModel, setSortModel] = useState(defaultSortModel);
    const [filterModel, setFilterModel] = useState({ items: [] });
    const [applyFilterTrigger, setApplyFilterTrigger] = useState(0);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

    // create/edit modal
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);

    // delete confirm
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // auto-response modal
    const [autoResponseOpen, setAutoResponseOpen] = useState(false);
    const [autoResponseTarget, setAutoResponseTarget] = useState(null);
    const [autoResponseForm, setAutoResponseForm] = useState(EMPTY_AUTO_RESPONSE);
    const [autoResponseSaving, setAutoResponseSaving] = useState(false);

    // active toggle
    const [togglingId, setTogglingId] = useState(null);

    // ── fetch ──────────────────────────────────────────────────────────────

    const fetchData = useCallback(async (pagination, sort = [], filter = {}) => {
        setLoading(true);
        try {
            const { field: sortField = '', sort: sortOrder = '' } = (Array.isArray(sort) && sort[0]) || {};
            const filterParams = FilterParams(filter);

            const queryParams = [
                `page=${pagination.page + 1}`,
                `pageSize=${pagination.pageSize}`,
                sortField ? `sortField=${sortField}` : '',
                sortOrder ? `sortOrder=${sortOrder}` : '',
                filterParams,
            ].filter(Boolean).join('&');

            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/events?${queryParams}`,
                { credentials: 'include' }
            );
            const json = await response.json();

            setEventList(json.data || []);
            setRowCount(json.total || 0);
        } catch (err) {
            console.error('Failed to fetch events:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(paginationModel, sortModel, filterModel);
    }, [paginationModel, sortModel, applyFilterTrigger]);

    // ── CSV export ─────────────────────────────────────────────────────────

    const handleExport = async () => {
        try {
            setIsDownloading(true);
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/events-csv`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch CSV');

            const contentDisposition = response.headers.get('Content-Disposition');
            let fileName = 'events.csv';
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

    // ── create/edit modal helpers ──────────────────────────────────────────

    const openCreate = () => {
        setFormData(EMPTY_FORM);
        setFormErrors({});
        setModalMode('create');
        setModalOpen(true);
    };

    const openEdit = (row) => {
        const formatted = row.event_date ? new Date(row.event_date).toISOString().slice(0, 16) : '';
        setFormData({ id: row.id, title: row.title || '', description: row.description || '', event_date: formatted });
        setFormErrors({});
        setModalMode('edit');
        setModalOpen(true);
    };

    const closeModal = () => setModalOpen(false);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setFormErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const errors = {};
        if (!formData.title.trim()) errors.title = 'Title is required';
        if (!formData.event_date) errors.event_date = 'Event date is required';
        return errors;
    };

    const handleSave = async () => {
        const errors = validate();
        if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

        setSaving(true);
        try {
            const isEdit = modalMode === 'edit';
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/events`, {
                method: isEdit ? 'PUT' : 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const json = await response.json();
            if (!json.status) throw new Error(json.message);
            showSnackbar(response.statusText, 'success');
            setModalOpen(false);
            fetchData(paginationModel, sortModel, filterModel);
        } catch (err) {
            showSnackbar(err.message, 'error');
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
            dispatch(triggerRefetch());
        }
    };

    // ── delete helpers ─────────────────────────────────────────────────────

    const openDelete = (row) => {
        setDeleteTarget(row);
        setDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/events/${deleteTarget.id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            const json = await response.json();
            if (!json.status) throw new Error(json.message);
            showSnackbar(response.statusText, 'success');
            setDeleteOpen(false);
            setDeleteTarget(null);
            fetchData(paginationModel, sortModel, filterModel);
        } catch (err) {
            console.error('Delete failed:', err);
            showSnackbar(err.message, 'error');
        } finally {
            setDeleting(false);
            dispatch(triggerRefetch());
        }
    };

    // ── auto-response helpers ──────────────────────────────────────────────

    const openAutoResponse = (row) => {
        setAutoResponseTarget(row);
        setAutoResponseForm({
            auto_response_general_de: row.auto_response_general_de || '',
            auto_response_general_en: row.auto_response_general_en || '',
            auto_response_guest_de: row.auto_response_guest_de || '',
            auto_response_guest_en: row.auto_response_guest_en || '',
        });
        setAutoResponseOpen(true);
    };

    const handleAutoResponseChange = (e) => {
        const { name, value } = e.target;
        setAutoResponseForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleAutoResponseSave = async () => {
        if (!autoResponseTarget) return;
        setAutoResponseSaving(true);
        try {
            const res = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/events/${autoResponseTarget.id}/auto-response`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(autoResponseForm),
                }
            );
            const json = await res.json();
            if (!json.status) throw new Error(json.message);
            showSnackbar('Auto-response settings saved', 'success');
            setAutoResponseOpen(false);
            fetchData(paginationModel, sortModel, filterModel);
        } catch (err) {
            console.error('Auto-response save failed:', err);
            showSnackbar(err.message, 'error');
        } finally {
            setAutoResponseSaving(false);
        }
    };

    // ── active toggle ──────────────────────────────────────────────────────

    const handleToggleActive = async (row, active) => {
        setTogglingId(row.id);
        try {
            const res = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/events/${row.id}/active`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ active }),
                }
            );
            const json = await res.json();
            if (!json.status) throw new Error(json.message);
            showSnackbar(active ? `"${row.title}" is now the active event` : `"${row.title}" deactivated`, 'success');
            fetchData(paginationModel, sortModel, filterModel);
            dispatch(triggerRefetch());
        } catch (err) {
            console.error('Toggle active failed:', err);
            showSnackbar(err.message, 'error');
        } finally {
            setTogglingId(null);
        }
    };

    // ── render ─────────────────────────────────────────────────────────────

    const columns = buildColumns(openEdit, openDelete, openAutoResponse, handleToggleActive, togglingId);

    return (
        <Box sx={{ padding: 1 }}>

            {/* ── toolbar ── */}
            <div className="row mb-1">
                <div className="col-lg-12 d-lg-flex justify-content-between align-items-center">

                    <div className="d-flex gap-2">
                        <Button
                            variant="outlined"
                            startIcon={<BsFiletypeCsv size={20} />}
                            onClick={handleExport}
                            sx={{ fontSize: 13, color: 'primary.main', textTransform: 'none' }}
                        >
                            {isDownloading ? <CircularProgress size={20} color="inherit" /> : 'Download (All Records) CSV'}
                        </Button>

                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<MdOutlineAddCircleOutline size={20} />}
                            onClick={openCreate}
                            sx={{ fontSize: 13, textTransform: 'none' }}
                        >
                            New Event
                        </Button>
                    </div>

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setApplyFilterTrigger((prev) => prev + 1)}
                        sx={{ fontSize: 13, textTransform: 'none' }}
                    >
                        Apply Filters
                    </Button>
                </div>
            </div>

            {/* ── grid ── */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <div style={{ width: '100%', height: 'calc(100vh - 175px)' }}>
                    <DataGrid
                        rows={eventList}
                        columns={columns}
                        rowsPerPageOptions={[25, 50, 100]}
                        paginationMode="server"
                        sortingMode="server"
                        filterMode="server"
                        rowCount={rowCount}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        sortModel={sortModel}
                        onSortModelChange={setSortModel}
                        filterModel={filterModel}
                        onFilterModelChange={setFilterModel}
                        disableRowSelectionOnClick
                        disableSelectionOnClick
                        showToolbar
                        pagination
                    />
                </div>
            )}

            {/* ── Create / Edit Modal ── */}
            <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>
                    {modalMode === 'create' ? 'Create New Event' : 'Edit Event'}
                </DialogTitle>

                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
                    <TextField
                        label="Title"
                        name="title"
                        value={formData.title}
                        onChange={handleFormChange}
                        error={!!formErrors.title}
                        helperText={formErrors.title}
                        fullWidth
                        size="small"
                    />
                    <TextField
                        label="Description"
                        name="description"
                        value={formData.description}
                        onChange={handleFormChange}
                        multiline
                        rows={3}
                        fullWidth
                        size="small"
                    />
                    <TextField
                        label="Event Date & Time"
                        name="event_date"
                        type="datetime-local"
                        value={formData.event_date}
                        onChange={handleFormChange}
                        error={!!formErrors.event_date}
                        helperText={formErrors.event_date}
                        fullWidth
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={closeModal} sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={saving}
                        sx={{ textTransform: 'none', minWidth: 90 }}
                    >
                        {saving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Delete Confirm Modal ── */}
            <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>Delete Event</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete{' '}
                    <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDelete}
                        disabled={deleting}
                        sx={{ textTransform: 'none', minWidth: 90 }}
                    >
                        {deleting ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Auto-Response Modal ── */}
            <Dialog open={autoResponseOpen} onClose={() => setAutoResponseOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>
                    Auto-Response Settings — <em style={{ fontWeight: 400 }}>{autoResponseTarget?.title}</em>
                </DialogTitle>

                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>

                    {/* Section A — Member */}
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Section A — Member auto-response
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5 }}>
                        Applies to: club_partner, club_member, expert, difa
                    </Typography>
                    <TextField
                        label="German (auto_response_general_de)"
                        name="auto_response_general_de"
                        value={autoResponseForm.auto_response_general_de}
                        onChange={handleAutoResponseChange}
                        multiline
                        rows={4}
                        fullWidth
                        size="small"
                        sx={{
                            "& .MuiInputBase-inputMultiline": {
                                resize: "vertical", // or "both"
                                overflow: "auto",
                            },
                        }}
                    />
                    <TextField
                        label="English (auto_response_general_en)"
                        name="auto_response_general_en"
                        value={autoResponseForm.auto_response_general_en}
                        onChange={handleAutoResponseChange}
                        multiline
                        rows={4}
                        fullWidth
                        size="small"
                        sx={{
                            "& .MuiInputBase-inputMultiline": {
                                resize: "vertical", // or "both"
                                overflow: "auto",
                            },
                        }}
                    />

                    <Divider />

                    {/* Section B — Guest */}
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Section B — Guest auto-response
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5 }}>
                        Applies to: expert_guest, only_guest, Wüstenkinder
                    </Typography>
                    <TextField
                        label="German (auto_response_guest_de)"
                        name="auto_response_guest_de"
                        value={autoResponseForm.auto_response_guest_de}
                        onChange={handleAutoResponseChange}
                        multiline
                        rows={4}
                        fullWidth
                        size="small"
                        sx={{
                            "& .MuiInputBase-inputMultiline": {
                                resize: "vertical", // or "both"
                                overflow: "auto",
                            },
                        }}
                    />
                    <TextField
                        label="English (auto_response_guest_en)"
                        name="auto_response_guest_en"
                        value={autoResponseForm.auto_response_guest_en}
                        onChange={handleAutoResponseChange}
                        multiline
                        rows={4}
                        fullWidth
                        size="small"
                        sx={{
                            "& .MuiInputBase-inputMultiline": {
                                resize: "vertical", // or "both"
                                overflow: "auto",
                            },
                        }}
                    />
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setAutoResponseOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleAutoResponseSave}
                        disabled={autoResponseSaving}
                        sx={{ textTransform: 'none', minWidth: 90 }}
                    >
                        {autoResponseSaving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default EventSection;
