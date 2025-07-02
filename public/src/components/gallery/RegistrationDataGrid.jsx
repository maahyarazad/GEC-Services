import React, { useEffect, useState } from 'react';
import {
    DataGrid
} from '@mui/x-data-grid';
import {
    Box, CircularProgress
} from '@mui/material';

const PAGE_SIZE = 15;

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
    const [page, setPage] = useState(0);
    const [rowCount, setRowCount] = useState(0);
    const [sortModel, setSortModel] = useState([]);
    const [filterModel, setFilterModel] = useState({});

    const fetchData = async (page, sortModel = [], filterModel = {}) => {
        setLoading(true);
        try {
            const sort = sortModel.length > 0 ? sortModel[0] : {};
            const { field: sortField, sort: sortOrder } = sort;

            const filterParams = Object.entries(filterModel).map(
                ([field, { value }]) => `filter_${field}=${encodeURIComponent(value)}`
            ).join('&');

            const queryParams = [
                `page=${page + 1}`,
                `pageSize=${PAGE_SIZE}`,
                sortField ? `sortField=${sortField}` : '',
                sortOrder ? `sortOrder=${sortOrder}` : '',
                filterParams
            ].filter(Boolean).join('&');

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/registration?${queryParams}`);
            const response_data = await response.json();

            setRegistrationList(response_data.data || []);
            setRowCount(response_data.total || response_data.data.length || 0);
            
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(page, sortModel, filterModel);
    }, [page, sortModel, filterModel]);

    return (
        <Box sx={{ padding: 2 }}>
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            ) : (
                <div style={{ width: '100%', height: 500 }}>
                    <DataGrid
                        rows={registrationList}
                        columns={columns}
                        pageSize={PAGE_SIZE}
                        rowsPerPageOptions={[PAGE_SIZE]}
                        paginationMode="server"
                        sortingMode="server"
                        filterMode="server"
                        rowCount={rowCount}
                        page={page}
                        onPageChange={(newPage) => setPage(newPage)}
                        onSortModelChange={(newModel) => setSortModel(newModel)}
                        onFilterModelChange={(newModel) => {
                            const filters = {};
                            newModel.items.forEach(item => {
                                if (item.value) {
                                    filters[item.field] = { value: item.value };
                                }
                            });
                            setFilterModel(filters);
                        }}
                        sortModel={sortModel}
                        disableSelectionOnClick
                        autoHeight
                    />
                </div>
            )}
        </Box>
    );
};
