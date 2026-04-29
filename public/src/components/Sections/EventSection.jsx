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
import { useSnackbar } from '../Providers/Snackbar';
import { BsFiletypeCsv } from 'react-icons/bs';
import { MdOutlineAddCircleOutline, MdOutlineEdit, MdDeleteOutline } from 'react-icons/md';

import FilterParams from '../Dashboard/FilterParams';
import { config } from '../../ui_config';

// ─── helpers ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
    title: '',
    description: '',
    event_date: '',
};

// ─── columns ────────────────────────────────────────────────────────────────
const formatDate = (value) => {
    return value ? new Date(value).toLocaleString() : '—';
};

const buildColumns = (onEdit, onDelete) => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'title', headerName: 'Title', width: 200, filterable: true },
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
        width: 110,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
            <div>
                <Tooltip title="Edit event" componentsProps={config.tooltip_config}>
                    <IconButton size="small" onClick={() => onEdit(params.row)} sx={{
                        color: "#1976d2",
                        "&:hover": { backgroundColor: "#e3f2fd" },
                    }}>
                        <MdOutlineEdit size={22} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete event" componentsProps={config.tooltip_config}>
                    <IconButton size="small" color="error" onClick={() => onDelete(params.row)} sx={{
                        color: "#d32f2f",
                        "&:hover": { backgroundColor: "#ffebee" },
                    }}>
                        <MdDeleteOutline size={22} />
                    </IconButton>
                </Tooltip>
            </div>
        ),
    },
];

// ─── component ──────────────────────────────────────────────────────────────

const EventSection = () => {
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

    // modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);

    // delete confirm state
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

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
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/events-csv`,
                { credentials: 'include' }
            );
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

    // ── modal helpers ──────────────────────────────────────────────────────

    const openCreate = () => {
        setFormData(EMPTY_FORM);
        setFormErrors({});
        setModalMode('create');
        setModalOpen(true);
    };

    const openEdit = (row) => {
        // Format datetime-local input value (YYYY-MM-DDTHH:mm)
        const formatted = row.event_date
            ? new Date(row.event_date).toISOString().slice(0, 16)
            : '';
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
            showSnackbar(response.statusText, "success");
            setModalOpen(false);
            fetchData(paginationModel, sortModel, filterModel);


        } catch (err) {
            
            showSnackbar(err.message, "error");
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
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
            showSnackbar(response.statusText, "success");
            setDeleteOpen(false);
            setDeleteTarget(null);
            fetchData(paginationModel, sortModel, filterModel);
        } catch (err) {
            console.error('Delete failed:', err);
            showSnackbar(err.message, "error");
        } finally {
            setDeleting(false);
        }
    };

    // ── render ─────────────────────────────────────────────────────────────

    const columns = buildColumns(openEdit, openDelete);

    return (
        <Box sx={{ padding: 1 }}>

            {/* ── toolbar ── */}
            <div className="row mb-1">
                <div className="col-lg-12 d-lg-flex justify-content-between align-items-center">

                    <div className="d-flex gap-2">
                        {/* CSV Download */}
                        <Button
                            variant="outlined"
                            startIcon={<BsFiletypeCsv size={20} />}
                            onClick={handleExport}
                            sx={{ fontSize: 13, color: 'primary.main', textTransform: 'none' }}
                        >
                            {isDownloading
                                ? <CircularProgress size={20} color="inherit" />
                                : 'Download (All Records) CSV'}
                        </Button>

                        {/* Create */}
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

                    {/* Apply Filters */}
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
                        InputLabelProps={{ shrink: true }}
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

        </Box>
    );
};

export default EventSection;
