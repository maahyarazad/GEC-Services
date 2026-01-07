import { useEffect, useState, useCallback } from 'react';
import {DataGrid} from '@mui/x-data-grid';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';

import {MdLockReset} from 'react-icons/md';
import {IoShieldCheckmarkSharp} from 'react-icons/io5';
import {FaExclamation} from 'react-icons/fa';
import {config} from '../../ui_config';
import FilterParams from '../admin/FilterParams';

const columns = ({ onResendPasswordReset, loadingRowId }) => [
    { field: 'id', headerName: 'ID', width: 70 },
    {
        field: 'change_password_required',
        headerName: 'Password Changed',
        width: 150,
        sortable: true,
        filterable: true,
        renderCell: (params) =>
            params.row.change_password_required ? (
                <Tooltip title="User has not updated the temporary password yet"
                componentsProps={config.tooltip_config}>
                    <FaExclamation color="red" size={20} />
                </Tooltip>
            ) : (
                <Tooltip title="User has successfully updated their password"
                componentsProps={config.tooltip_config}>
                    <IoShieldCheckmarkSharp color="green" size={20} />
                </Tooltip>
            ),
    },
    {
        field: 'actions',
        headerName: 'Actions',
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
            <Box>
                <Tooltip componentsProps={config.tooltip_config}
                title="Send reset password email to this user">

                    <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<MdLockReset />}
                        sx={{ textTransform: 'none' }}
                        onClick={() => onResendPasswordReset(params.row)}
                    >

                        {loadingRowId === params.row.id ? (
                            <CircularProgress size={18} color="inherit" />
                        ) : (
                            "Password"
                        )}
                    </Button>
                </Tooltip>

            </Box>
        ),
    },
    // Base fields
    { field: 'email', headerName: 'Email', width: 200, filterable: true },
    { field: 'created_at', headerName: 'Created At', width: 180, filterable: true },

    // Extra fields
    { field: 'firstName', headerName: 'First Name', width: 150, filterable: true },
    { field: 'lastName', headerName: 'Last Name', width: 150, filterable: true },
    { field: 'phone', headerName: 'Phone', width: 150, filterable: true },
    { field: 'mobile', headerName: 'Mobile', width: 150, filterable: true },
    { field: 'gender', headerName: 'Gender', width: 120, filterable: true },
    { field: 'industry', headerName: 'Industry', width: 180, filterable: true },
    { field: 'company', headerName: 'Company', width: 200, filterable: true },
    { field: 'website', headerName: 'Website', width: 200, filterable: true },
    { field: 'address_street', headerName: 'Street', width: 200, filterable: true },
    { field: 'address_area', headerName: 'Area', width: 180, filterable: true },
    { field: 'address_city', headerName: 'City', width: 150, filterable: true },
    { field: 'address_emirate', headerName: 'Emirate', width: 150, filterable: true },
    { field: 'address_country', headerName: 'Country', width: 150, filterable: true },
];


const GICDataGrid = () => {
    const defaultSortModel = [{ field: 'id', sort: 'desc' }];
    const [loadingRowId, setLoadingRowId] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [rowCount, setRowCount] = useState(0);
    const [sortModel, setSortModel] = useState(defaultSortModel);
    const [filterModel, setFilterModel] = useState({
        items: [],
    });
    const [applyFilterTrigger, setApplyFilterTrigger] = useState(0);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

    const handleResetPassword = async (row) => {
        try {
            setLoadingRowId(row.id);
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/gic-user/send-reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: row.email }),
                credentials: "include"
            });

            const data = await response.json();

        } catch (error) {
            console.error("Error resetting password:", error);
        } finally {
            setLoadingRowId(null);
        }
    };

    const [initialData, setInitialData] = useState(null);
    const fetchData = useCallback(
        async (paginationModel, sortModel = [], filterModel = { items: [] }) => {
            setLoading(true);
            try {
                const sort = Array.isArray(sortModel) && sortModel.length > 0 ? sortModel[0] : {};
                const sortField = sort.field || '';
                const sortOrder = sort.sort || '';

                // Parse filters from filterModel.items
            const filterParams = FilterParams(filterModel);

                const queryParams = [
                    `page=${paginationModel.page + 1}`,
                    `pageSize=${paginationModel.pageSize}`,
                    sortField ? `sortField=${sortField}` : '',
                    sortOrder ? `sortOrder=${sortOrder}` : '',
                    filterParams,
                ].filter(Boolean).join('&');

                const response = await fetch(`${import.meta.env.VITE_SERVERURL}/gic-user?${queryParams}`, {credentials:"include"});

                const data = await response.json();

                setMembers(data.data || []);
                setRowCount(data.total || 0);
            } catch (err) {
                console.error('Failed to fetch:', err);
            } finally {
                setLoading(false);
            }
        },
        [setLoading, setMembers, setRowCount]
    );

    useEffect(() => {
        fetchData(paginationModel, sortModel, filterModel);
    }, [paginationModel, sortModel, applyFilterTrigger]);


    return (
        <Box sx={{ padding: 1 }}>
            <div className='row mb-1'>

                <div className="d-lg-flex justify-content-end mb-1">

                    <div className="">
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
            </div>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            ) : (
                <div style={{ width: '100%', height: 'calc(100vh - 155px)' }}>
                    <DataGrid
                        rows={members}
                        columns={columns({ onResendPasswordReset: handleResetPassword, loadingRowId: loadingRowId })}
                        rowCount={rowCount}
                        rowsPerPageOptions={[25, 50, 100]}
                        paginationMode="server"
                        sortingMode="server"
                        filterMode="server"
                        paginationModel={paginationModel}
                        sortModel={sortModel}
                        onPaginationModelChange={setPaginationModel}
                        onSortModelChange={setSortModel}
                        filterModel={filterModel}              // ✅ Pass full model
                        onFilterModelChange={(newModel) => {
                            setFilterModel(newModel); // use the raw model now
                        }}
                        // ✅ Accept full model
                        disableRowSelectionOnClick
                        disableSelectionOnClick
                        showToolbar
                    />
                </div>
            )}


        </Box>
    );
};

export default GICDataGrid;
