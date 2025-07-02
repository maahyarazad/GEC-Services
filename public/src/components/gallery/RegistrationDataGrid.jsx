import React, { useEffect, useState } from 'react';
import {
    DataGrid
} from '@mui/x-data-grid';
import {
    Box, CircularProgress, Button, TextField
} from '@mui/material';

const PAGE_SIZE = 5;
 const columns = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'event', headerName: 'event', width: 130 },
        { field: 'email', headerName: 'Email', width: 160 },
        { field: 'phone', headerName: 'Phone', width: 150 },
        { field: 'whatsapp', headerName: 'WhatsApp', width: 150 },
        { field: 'gender', headerName: 'Gender', width: 100 },
        { field: 'companyName', headerName: 'Company Name', width: 100 },
        { field: 'birthday', headerName: 'Birthday', width: 100 },
        { field: 'event_id', headerName: 'Event ID', width: 100 },
        { field: 'metadata_createdAt', headerName: 'Creation Datetime', width: 160 },
        { field: 'metadata_modifiedAt', headerName: 'Last Modified Datetime', width: 160 }
    ];
export const RegistrationDataGrid = () => {
    const [registrationList, setRegistrationList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowCount, setRowCount] = useState(0);
    const [search, setSearch] = useState('');

    const fetchData = async (page, search = '') => {
        setLoading(true);
        try {
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/registration?page=${page + 1}&pageSize=${PAGE_SIZE}&search=${search}`
            );
            const response_data = await response.json();
            debugger;
            setRegistrationList(response_data.data || []);
            setRowCount(response_data.data.length || 0);
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(page, search);
    }, [page, search]);

   

    return (
        <Box sx={{ padding: 2 }}>
            <Box sx={{ marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
                <TextField
                    label="Search"
                    variant="outlined"
                    size="small"
                    onChange={(e) => setSearch(e.target.value)}
                />
            </Box>

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
                        rowCount={rowCount}
                        onPageChange={(newPage) => setPage(newPage)}
                        page={page}
                        disableSelectionOnClick
                        autoHeight
                    />
                </div>
            )}
        </Box>
    );
}
