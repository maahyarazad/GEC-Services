import React, { useEffect, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';

import { BsFiletypeCsv } from 'react-icons/bs';
import { FaCircleCheck } from 'react-icons/fa6';
import { FcFlashAuto } from 'react-icons/fc';
import { TfiWrite } from 'react-icons/tfi';
import { GrVirtualMachine } from 'react-icons/gr';

import MessageModalTrigger from '../utils/MessageModalTrigger';
import { config } from '../../ui_config';
import RegistrationConfigSearch from './RegistrationConfigSearch';
import CustomDataGrid from '../CustomDataGrid'; // adjust path as needed

// ─── Column definitions (unchanged) ──────────────────────────────────────────

const columns = [
    { field: 'id', headerName: 'ID', width: 60 },
    {
        field: '',
        headerName: 'Complete',
        width: 100,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
            const modified = params?.row?.metadata_modifiedAt;
            return modified ? (
                <Tooltip componentsProps={config.tooltip_config} title={`Completed at ${modified}`}>
                    <FaCircleCheck size={16} color="#28a745" />
                </Tooltip>
            ) : null;
        }
    },
    {
        field: 'status',
        headerName: 'Payment Status',
        width: 100,
        sortable: true,
        filterable: true,
        disableColumnMenu: true,
        renderCell: (params) => {
            return params?.row?.status ? (
                <Tooltip componentsProps={config.tooltip_config} title={`Payment Id ${params?.row?.id}`}>
                    <FaCircleCheck size={16} color="#28a745" />
                </Tooltip>
            ) : null;
        }
    },
    {
        field: 'metadata_json',
        headerName: 'Schedule Time',
        width: 130,
        filterable: false,
        renderCell: (params) => {
            const raw = params?.row?.metadata_json;
            return raw ? (
                <>{new Date(JSON.parse(raw).selected_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
            ) : <></>;
        }
    },
    {
        field: 'message',
        headerName: 'Message',
        width: 120,
        sortable: false,
        filterable: true,
        renderCell: (params) => {
            const message = params?.row?.message;
            if (!message) return null;
            if (message === 'AUTO_REGISTER')            return <FcFlashAuto size={16} title='This record has been automatically registered from the Google Sheet.' />;
            if (message === 'MANUAL_REGISTER')          return <TfiWrite size={16} title='This person has been manually registered for the event.' />;
            if (message === 'AUTO_MEMBERSHIP_REGISTER') return <GrVirtualMachine color='orange' size={16} title='This person used the virtual membership card at the venue.' />;
            return <MessageModalTrigger message={message} />;
        }
    },
    { field: 'event',              headerName: 'Event',                 width: 130, filterable: true },
    { field: 'firstName',          headerName: 'Firstname',             width: 130, filterable: true },
    { field: 'lastName',           headerName: 'Lastname',              width: 130, filterable: true },
    { field: 'email',              headerName: 'Email',                 width: 160, filterable: true },
    { field: 'phone',              headerName: 'Phone',                 width: 150, filterable: true },
    { field: 'whatsapp',           headerName: 'WhatsApp',              width: 150, filterable: true },
    { field: 'gender',             headerName: 'Gender',                width: 100, filterable: true },
    { field: 'birthday',           headerName: 'Birthday',              width: 100, filterable: true },
    { field: 'event_id',           headerName: 'Event ID',              width: 100, filterable: true },
    {
        field: 'attachment_file',
        headerName: 'Attachment',
        width: 100,
        renderCell: (params) => {
            const filename = params?.row?.attachment_file;
            if (filename) {
                const fileUrl = `${import.meta.env.VITE_SERVERURL}/uploads/${filename}`;
                return (
                    <a href={fileUrl} download style={{ textDecoration: 'none' }} target='_blank' rel='noreferrer'>
                        <Button variant='contained' color='primary' sx={{ textTransform: 'none', fontSize: 12, padding: 0 }}>
                            Download
                        </Button>
                    </a>
                );
            }
        }
    },
    { field: 'metadata_createdAt',  headerName: 'Creation Datetime',      width: 160, filterable: true },
    { field: 'metadata_modifiedAt', headerName: 'Last Modified Datetime',  width: 160, filterable: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts the flat filterItems array (from CustomDataGrid) into a query-string
 * segment that your backend can parse.
 *
 * Produces params like:
 *   filterField[]=email&filterOperator[]=contains&filterValue[]=john
 *
 * Adjust the key names to match whatever your backend expects.
 */
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

const RegistrantSection = () => {
    const defaultSortModel = [{ field: 'id', sort: 'desc' }];

    const [registrationList, setRegistrationList] = useState([]);
    const [selectedEvent,    setSelectedEvent]    = useState(null);
    const [loading,          setLoading]          = useState(false);
    const [isDownloading,    setIsDownloading]    = useState(false);
    const [rowCount,         setRowCount]         = useState(0);
    const [sortModel,        setSortModel]        = useState(defaultSortModel);
    const [paginationModel,  setPaginationModel]  = useState({ page: 0, pageSize: 25 });

    // ✅ filterItems is now a plain array — the shape CustomDataGrid expects
    const [filterItems, setFilterItems] = useState([]);

    // ─── Fetch ────────────────────────────────────────────────────────────────

    const fetchData = useCallback(async (_selectedEvent, pagination, sort = [], filters = []) => {
        setLoading(true);
        try {
            const { field: sortField = '', sort: sortOrder = '' } = sort[0] ?? {};

            // Build filter query string from the flat array
            const filterParams = buildFilterParams(filters);

            const queryParams = [
                `page=${pagination.page + 1}`,
                `pageSize=${pagination.pageSize}`,
                sortField ? `sortField=${sortField}` : '',
                sortOrder ? `sortOrder=${sortOrder}` : '',
                filterParams,
            ].filter(Boolean).join('&');

            
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/registration?${queryParams}&filter_event=${_selectedEvent}`,
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

    // ─── Effects ──────────────────────────────────────────────────────────────

    useEffect(() => {
        if (selectedEvent) fetchData(selectedEvent, paginationModel, sortModel, filterItems);
    }, [paginationModel, sortModel, filterItems, selectedEvent]);

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleCheck = (e) => setSelectedEvent(e);

    // When filters change, reset to page 0 so results are consistent
    const handleFilterItemsChange = (newItems) => {
        setFilterItems(newItems);
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
    };

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

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <Box sx={{ padding: 1 }}>

            {/* Top buttons row */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
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
                {/* "Apply Filters" button is no longer needed — filters trigger
                    re-fetch automatically via the useEffect dependency on filterItems.
                    Remove or keep for UX preference. */}
            </Box>

            {/* Main content: sidebar + datagrid */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1, alignItems: 'flex-start' }}>

                {/* Sidebar */}
                <Box sx={{ width: { xs: '100%', md: '220px' }, flexShrink: 0 }}>
                    <RegistrationConfigSearch onSelect={handleCheck} />
                </Box>

                {/* DataGrid */}
                <Box sx={{ flex: 1, minWidth: 0, width: '100%', height: { xs: '60vh', md: 'calc(100vh - 175px)' } }}>
                    <CustomDataGrid
                        rows={registrationList}
                        columns={columns}
                        loading={loading}
                        showToolbar

                        // Server-side modes
                        filterMode='server'
                        sortingMode='server'
                        paginationMode='server'

                        // Pagination
                        rowCount={rowCount}
                        paginationModel={paginationModel}
                        onPaginationModelChange={(newModel) => setPaginationModel(newModel)}
                        rowsPerPageOptions={[25, 50, 100, 500]}

                        // Sorting
                        sortModel={sortModel}
                        onSortModelChange={(newModel) => setSortModel(newModel)}

                        // ✅ Filters — plain array, not { items: [] }
                        filterItems={filterItems}
                        onFilterItemsChange={handleFilterItemsChange}

                        getRowHeight={(params) => params?.row?.company_data ? 200 : 52}
                        disableRowSelectionOnClick
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default RegistrantSection;
