import React, { useEffect, useState, useCallback } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, CircularProgress, Tooltip, Button } from '@mui/material';
import { BsFiletypeCsv } from "react-icons/bs";


const PAGE_SIZE = 10;

const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'event', headerName: 'Event', width: 130, filterable: true },
    { field: 'email', headerName: 'Email', width: 160, filterable: true },
    { field: 'phone', headerName: 'Phone', width: 150, filterable: true },
    { field: 'whatsapp', headerName: 'WhatsApp', width: 150, filterable: true },
    { field: 'gender', headerName: 'Gender', width: 100, filterable: true },
    { field: 'companyName', headerName: 'Company Name', width: 100, filterable: true },
    { field: 'birthday', headerName: 'Birthday', width: 100, filterable: true },
    { field: 'event_id', headerName: 'Event ID', width: 100, filterable: true },
    { field: 'metadata_createdAt', headerName: 'Creation Datetime', width: 160, filterable: true },
    { field: 'metadata_modifiedAt', headerName: 'Last Modified Datetime', width: 160, filterable: true }
];

export const RegistrationDataGrid = () => {
    const [registrationList, setRegistrationList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isDownloading, setIsDownloadings] = useState(false);
    const [filterModel, setFilterModel] = useState({
        items: [],
    });
        const [applyFilterTrigger, setApplyFilterTrigger] = useState(0);
    const [rowCount, setRowCount] = useState(0);
    const [sortModel, setSortModel] = useState([]);
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 25,
    });

    const fetchData = useCallback(async (paginationModel, sortModel = [], filterModel = {}) => {
        setLoading(true);
        try {

                const sort = Array.isArray(sortModel) && sortModel.length > 0 ? sortModel[0] : {};
                const sortField = sort.field || '';
                const sortOrder = sort.sort || '';

            // Parse filters from filterModel.items
            const filterParams = Array.isArray(filterModel.items)
                ? filterModel.items
                    .filter(item => item?.field && item?.value) // Ensure valid filters
                    .map(item => `filter_${item.field}=${encodeURIComponent(item.value)}`)
                    .join('&')
                : '';

            const queryParams = [
                `page=${paginationModel.page + 1}`,
                `pageSize=${paginationModel.pageSize}`,
                sortField ? `sortField=${sortField}` : '',
                sortOrder ? `sortOrder=${sortOrder}` : '',
                filterParams
            ].filter(Boolean).join('&');

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/registration?${queryParams}`);
            const response_data = await response.json();

            setRegistrationList(response_data.data || []);
            setRowCount(response_data.total || 0);

        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setLoading(false);
        }
    },[])

    useEffect(() => {
            fetchData(paginationModel, sortModel, filterModel);
        }, [paginationModel, sortModel, applyFilterTrigger]);




    const handleExport = async () => {
        try {
            setIsDownloadings(true);

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/registration-csv-data`);

            if (!response.ok) {
                throw new Error('Failed to fetch CSV file');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'registration.csv'); // Set desired file name
            document.body.appendChild(link);
            link.click();

            // Cleanup
            link.remove();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Download failed", error);
        } finally {
            setIsDownloadings(false);
        }
    };


    return (


        <Box sx={{ padding: 1 }}>
            <div className="d-flex justify-content-start mb-1">
                <div className="me-2">
                    <Tooltip title="Download CSV data" componentsProps={{ tooltip: { sx: { fontSize: 14 } } }}>
                    </Tooltip>
                    {isDownloading ? <div className='d-flex'>
                        <span className='me-2'>Downloading</span>
                        <CircularProgress
                            size={20}
                            color="inherit"
                        />
                    </div>


                        :
                        <Button
                            variant="outlined"
                            startIcon={<BsFiletypeCsv size={20} />}
                            onClick={handleExport}
                            sx={{ fontSize: 14, color: 'primary.main', textTransform: 'none' }}
                        >
                            Download (All Records) CSV
                        </Button>
                    }

                </div>
                <div className="">
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={() => setApplyFilterTrigger((prev) => prev + 1)}
                                        sx={{ fontSize: 14, textTransform: 'none' }}
                                    >
                                        Apply Filters
                                    </Button>
                                </div>
            </div>
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            ) : (

                <div style={{ width: '100%', height: '82dvh' }}>
                    <DataGrid
                        rows={registrationList}
                        columns={columns}

                        rowsPerPageOptions={[25, 50, 100]}
                        paginationMode="server"
                        sortingMode="server"
                        filterMode="server"
                        rowCount={rowCount}
                        paginationModel={paginationModel}
                        onPaginationModelChange={(newModel) => {
                            setPaginationModel(newModel);
                        }}
                        onSortModelChange={(newModel) => {
                            // console.log('Sort model changed:', newModel);
                            setSortModel(newModel)
                        }}
                        filterModel={filterModel}    
                        onFilterModelChange={(newModel) => {
                            setFilterModel(newModel); // use the raw model now
                        }}
                        sortModel={sortModel}
                        disableRowSelectionOnClick
                        disableSelectionOnClick
                        showToolbar
                        pagination
                    />

                </div>
            )}
        </Box>
    );
};
