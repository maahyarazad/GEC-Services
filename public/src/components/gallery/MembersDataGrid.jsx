import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DataGrid, GridToolbar, GridToolbarFilterButton } from '@mui/x-data-grid';
import { Box, CircularProgress, Tooltip, Button, Switch } from '@mui/material';
import { BsFiletypeCsv } from "react-icons/bs";
import MemberRequestForm from "../../components/admin/Member/MemberRequestForm";
import { MdFormatListBulletedAdd } from "react-icons/md";
import Modal from "../../components/Modal";
import debounce from 'lodash/debounce';

const columns = ({ onEdit, onSwitchActive }) => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'firstName', headerName: 'First Name', width: 130, filterable: true },
    { field: 'lastName', headerName: 'Last Name', width: 130, filterable: true },
    { field: 'phoneNumber', headerName: 'Phone Number', width: 150, filterable: true },
    { field: 'whatsapp', headerName: 'WhatsApp', width: 150, filterable: true },
    { field: 'language', headerName: 'Language', width: 100, filterable: true },
    { field: 'uniqueIdentifier', headerName: 'Unique ID', width: 160, filterable: true },
    { field: 'createdAt', headerName: 'Created At', width: 160, filterable: true },
    { field: 'modifiedAt', headerName: 'Modified At', width: 160, filterable: true },
    {
        field: 'actions',
        headerName: 'Actions - Active Member',
        width: 180,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
            <Box>
                <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    style={{ marginRight: 8, textTransform: 'none' }}
                    onClick={() => onEdit(params.row)}
                >
                    Edit
                </Button>
                <Tooltip title="Switch Active Member" componentsProps={{ tooltip: { sx: { fontSize: 14 } } }}>
                    <Switch
                        checked={params.row.active_member === true || params.row.active_member === "true"}
                        onChange={() => onSwitchActive(params.row)}
                        color="primary"
                    />
                </Tooltip>


            </Box>
        ),
    },
];

export const MemberDataGrid = () => {
    const defaultSortModel = [{ field: 'id', sort: 'desc' }];
    const [newReg, setNewReg] = useState(false);
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
    const [editReg, setEditReg] = useState(false);
    const [initialData, setInitialData] = useState(null);
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

                const response = await fetch(`${import.meta.env.VITE_SERVERURL}/member?${queryParams}`);
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

    const debouncedFetch = useCallback(
        debounce((pagination, sort, filter) => {
            fetchData(pagination, sort, filter);
        }, 500),
        []
    );


    useEffect(() => {
        fetchData(paginationModel, sortModel, filterModel);
    }, [paginationModel, sortModel, applyFilterTrigger]);

    const handleExport = async () => {
        try {
            setIsDownloading(true);
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/member-csv-data`, {credentials:"include"});
            if (!response.ok) throw new Error('Failed to fetch CSV');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'members.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed", error);
        } finally {
            setIsDownloading(false);
        }
    };


    const openEdit = (row) => {
        const selectedRow = members?.find((x) => x.id === row.id);
        
        if (selectedRow) {
            setInitialData(selectedRow);
            setEditReg(true);
        }
    };

    const timeoutRef = useRef(null);
    const handleModalSwitch = () => {
        setEditReg(false);
        fetchData(paginationModel, sortModel, filterModel);
        
        timeoutRef.current = setTimeout(() => {
            setInitialData(null);
        }, 100);
        };

        useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
        }, []);

    // const openEdit = async (row) => {
    //     try{

    //         initialData = row;
    //         const formData = new FormData();
    
    //         if (row) {
    //             formData.append('id', row.id);
    //             formData.append('active-member-switch', row.active_member);
    //         };
    
    
    
    //         const response = await fetch(`${import.meta.env.VITE_SERVERURL}/member`, {
    //             method: 'POST',
    //             body: formData,
    //         });


    //         if(!response.ok) throw new Error('Failed to modify the member.');

    //         fetchData(paginationModel, sortModel, filterModel);

    //     }catch (err) {
    //         console.error('Error fetching data:', err);
    //     }
    // };

    const switchActive = async (row) => {
        try{
            const formData = new FormData();
            if (row) {
                formData.append('id', row.id);
                formData.append('active_member', row.active_member);
            };
    
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/active-member-switch`, {
                method: 'POST',
                body: formData,
                credentials : "include"
            });

            if(!response.ok) throw new Error('Failed to switch member activation.');

            fetchData(paginationModel, sortModel, filterModel);

        }catch (err) {
            console.error('Error fetching data:', err);
        }
    };

    return (
        <Box sx={{ padding: 1 }}>



            <div className="d-flex justify-content-start mb-1">
                <div className="me-2">
                    <Button
                        variant="outlined"
                        startIcon={<MdFormatListBulletedAdd size={24} />}
                        onClick={() => setNewReg(true)}
                        sx={{ fontSize: 14, textTransform: 'none' }}
                    >
                        Add Member
                    </Button>
                </div>

                <div className='me-2'>

                    {isDownloading ? (
                        <div className='d-flex mw-2'>
                            <span className=''>Downloading</span>
                            <CircularProgress size={20} color="inherit" />
                        </div>
                    ) : (
                        <Button
                            variant="outlined"
                            startIcon={<BsFiletypeCsv size={20} />}
                            onClick={handleExport}
                            sx={{ fontSize: 14, color: 'primary.main', textTransform: 'none' }}
                        >
                            Download (All Records) CSV
                        </Button>
                    )}
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
                        rows={members}
                        columns={columns({ onEdit: openEdit, onSwitchActive: switchActive })}
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

            <Modal isOpen={newReg}
                onRequestClose={() => setNewReg(false)}
                title={"New Member"}>
                <MemberRequestForm
                    initialData={null}
                    modalSwitch={() => {
                        setNewReg(false);
                        fetchData(paginationModel, sortModel, filterModel);

                    }} />
            </Modal>

            <Modal isOpen={editReg}
                onRequestClose={handleModalSwitch}
                title={`Modify ${initialData?.firstName} ${initialData?.lastName}`}>
               <MemberRequestForm
                    initialData={initialData}
                    modalSwitch={handleModalSwitch}
                    />
            </Modal>
        </Box>
    );
};
