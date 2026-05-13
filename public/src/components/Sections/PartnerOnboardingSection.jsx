import { useEffect, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';

import { BsFiletypeCsv } from 'react-icons/bs';

import CustomDataGrid from '../CustomDataGrid';

// ─── Column definitions ───────────────────────────────────────────────────────

const columns = [
    {
        field: 'id',
        headerName: 'ID',
        width: 60,
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
                return new Date(bday).toLocaleDateString([], {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                });
            } catch {
                return bday;
            }
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
            const label = lang === 'en' ? '🇬🇧 EN' : lang === 'de' ? '🇩🇪 DE' : lang;
            return <span style={{ fontSize: 13 }}>{label}</span>;
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
                return new Date(ts).toLocaleString([], {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                });
            } catch {
                return ts;
            }
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
                <Chip
                    label="Matched"
                    size="small"
                    color="success"
                    variant="filled"
                    sx={{ fontSize: 11, fontWeight: 600 }}
                />
            ) : (
                <Chip
                    label="No Match"
                    size="small"
                    color="default"
                    variant="outlined"
                    sx={{ fontSize: 11 }}
                />
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

    const [registrationList, setRegistrationList] = useState([]);
    const [loading,          setLoading]          = useState(false);
    const [isDownloading,    setIsDownloading]    = useState(false);
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

    // ─── Effects ──────────────────────────────────────────────────────────────

    useEffect(() => {
        fetchData(paginationModel, sortModel, filterItems);
    }, [paginationModel, sortModel, filterItems]);

    // ─── Handlers ─────────────────────────────────────────────────────────────

    

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

            {/* Main content: sidebar + datagrid */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1, alignItems: 'flex-start' }}>

               

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

                        // Filters
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
