import { useEffect, useState, useCallback } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, CircularProgress, Button, Tooltip } from '@mui/material';
import DashboardCards from '../admin/Dashboard/DashboardCards';
import { MdWorkspacePremium } from "react-icons/md";
const columns = ({ onResendPasswordReset, loadingRowId }) => [
    { field: 'id', headerName: 'ID', width: 70 },
    {
        field: 'type', headerName: 'Type', width: 70, filterable: true,
        renderCell: (params) => {
            switch (params.row.type) {
                case 7:
                    return <><MdWorkspacePremium color="#AF0F0F" size={22} /></>
                case 5:
                    return <><MdWorkspacePremium color="#55729E" size={22} /></>;
                default:
                    return <MdWorkspacePremium color="#cc0000" size={22} />;
            }
        },
    },
    { field: 'card_number', headerName: 'Card Number', width: 150, filterable: true },
    { field: 'firstname', headerName: 'First Name', width: 150, filterable: true },
    { field: 'lastname', headerName: 'Last Name', width: 150, filterable: true },
    { field: 'card_expiry_date', headerName: 'Card Expiry Date', width: 200, filterable: true },
    { field: 'mobile_number', headerName: 'Mobile Number', width: 180, filterable: true },
    { field: 'email', headerName: 'Email', width: 220, filterable: true },

    { field: 'memberId', headerName: 'Member ID', width: 150, filterable: true },
    { field: 'username', headerName: 'Username', width: 200, filterable: true },
    { field: 'title', headerName: 'Title', width: 120, filterable: true },
    { field: 'gender', headerName: 'Gender', width: 120, filterable: true },
    { field: 'last_login', headerName: 'Last Login', width: 200, filterable: true },
];


export const MemberCardDataGrid = () => {
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
                credentials: "include",
                body: JSON.stringify({ email: row.email }),
            });

            const data = await response.json();

        } catch (error) {
            console.error("Error resetting password:", error);
        } finally {
            setLoadingRowId(null);
        }
    };

    const [initialData, setInitialData] = useState(null);

    const fetchDashboardData = useCallback(async()=>{
        try {
                setLoading(true);
                

                const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/member_card_report`, {credentials:"include"});
                
            } catch (err) {
                console.error('Failed to fetch:', err);
            } finally {
                setLoading(false);
            }
    },
        
        []
    );

    const fetchData = useCallback(
        async (paginationModel, sortModel = [], filterModel = { items: [] }) => {
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
                    filterParams,
                ].filter(Boolean).join('&');

                const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/member_card?${queryParams}`, { credentials: "include" });

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
        fetchDashboardData();
    }, [paginationModel, sortModel, applyFilterTrigger, fetchDashboardData]);


    return (
        <Box sx={{ padding: 1 }}>
            <div className="row mb-1">

                <div className="d-lg-flex justify-content-between align-items-center">
                    <div>

                        <DashboardCards/>
                    </div>
                    <div style={{alignSelf: 'end'}}>

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
                <div style={{ width: '100%', height: '74vh' }}>
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
