import React, { useEffect, useState } from 'react';
import {
    DataGrid
} from '@mui/x-data-grid';
import {
    Box, CircularProgress
} from '@mui/material';

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

    const [rowCount, setRowCount] = useState(0);
    const [sortModel, setSortModel] = useState([]);
    const [filterModel, setFilterModel] = useState({});
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 25,
    });
    const fetchData = async (paginationModel, sortModel = [], filterModel = {}) => {
        setLoading(true);
        try {

            const sort = Array.isArray(sortModel) && sortModel.length > 0 ? sortModel[0] : {};

            const sortField = sort.field || '';
            const sortOrder = sort.sort || '';

            const filterParams = Object.entries(filterModel).map(
                ([field, { value }]) => `filter_${field}=${encodeURIComponent(value)}`
            ).join('&');

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
    };

    useEffect(() => {
        fetchData(paginationModel, sortModel, filterModel);
    }, [paginationModel, sortModel, filterModel]);

    return (
        <Box sx={{ padding: 2 }}>
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            ) : (
                <div style={{ width: '100%', height: '85vh' }}>
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
                        filterModel={{
                            items: Object.entries(filterModel).map(([field, { value }]) => ({
                            field,
                            value,
                            operator: 'contains' // optionally specify operator
                            }))
                        }}
                        onFilterModelChange={(newModel) => {
                            const filters = {};
                            newModel.items.forEach(item => {
                            if (item.value && item.field) {
                                filters[item.field] = { value: item.value };
                            }
                            });
                            setFilterModel(filters);
                        }}
                        sortModel={sortModel}
                        disableSelectionOnClick
                        pagination
                    />

                </div>
            )}
        </Box>
    );
};
