import React, { useEffect, useState, useCallback, useRef } from 'react';

// Direct import from x-data-grid main entry is usually fine, but to optimize:
import {DataGrid} from '@mui/x-data-grid';
import { RiEditLine } from "react-icons/ri";

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';

import {BsFiletypeCsv} from 'react-icons/bs';
import {MdFormatListBulletedAdd} from 'react-icons/md';
import {MdAddCircleOutline} from 'react-icons/md';

import MemberRequestForm from '../Dashboard/Member/MemberRequestForm';
import Modal from '../Modal';
import debounce from 'lodash/debounce';
import { config } from '../../ui_config';
import FilterParams from '../Dashboard/FilterParams';
import { IconButton } from '@mui/material';


const columns = ({ onEdit, onSwitchActive }) => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'firstName', headerName: 'First Name', width: 130, filterable: true },
    { field: 'lastName', headerName: 'Last Name', width: 130, filterable: true },
    { field: 'phoneNumber', headerName: 'Phone Number', width: 150, filterable: true },
    { field: 'whatsapp', headerName: 'WhatsApp', width: 150, filterable: true },
    { field: 'email', headerName: 'Email', width: 300, filterable: true },
    // { field: 'uniqueIdentifier', headerName: 'Unique ID', width: 160, filterable: true },
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
                 <Tooltip title="Edit Member" componentsProps={config.tooltip_config}>
                                    <IconButton size="small" onClick={() => onEdit(params.row)} sx={{
                                        color: "#1976d2",
                                        "&:hover": { backgroundColor: "#e3f2fd" },
                                    }}>
                                        <RiEditLine size={22} />
                                    </IconButton>
                                </Tooltip>
                <Tooltip title="Switch Active Member" componentsProps={config.tooltip_config}>
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

const MemberDataGrid = () => {
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
                const filterParams = FilterParams(filterModel);

                const queryParams = [
                    `page=${paginationModel.page + 1}`,
                    `pageSize=${paginationModel.pageSize}`,
                    sortField ? `sortField=${sortField}` : '',
                    sortOrder ? `sortOrder=${sortOrder}` : '',
                    filterParams,
                ].filter(Boolean).join('&');

                const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/member?${queryParams}`, { credentials: "include" });
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

    const handleExport = async () => {
        try {
            setIsDownloading(true);
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/member-csv-data`, { credentials: "include" });
            if (!response.ok) throw new Error('Failed to fetch CSV');

            const contentDisposition = response.headers.get("Content-Disposition");

            let fileName = "download.csv"; // fallback
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match) {
                    fileName = match[1];
                }
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
        try {
            const formData = new FormData();
            if (row) {
                formData.append('id', row.id);
                formData.append('active_member', row.active_member);
            };

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/active-member-switch`, {
                method: 'POST',
                body: formData,
                credentials: "include"
            });

            if (!response.ok) throw new Error('Failed to switch member activation.');

            fetchData(paginationModel, sortModel, filterModel);

        } catch (err) {
            console.error('Error fetching data:', err);
        }
    };

    return (
        <Box sx={{ padding: 1 }}>


            

            <div className="d-flex justify-content-start mb-1">
                    <div className='me-2'>

                            <Button
color="success"
                                variant="contained"
                                startIcon={<MdAddCircleOutline size={20} />}
                                onClick={() => setNewReg(true)}
                                sx={{ fontSize: 13, textTransform: 'none', wordBreak: 'break-all' }}
                            >
                                New Member
                            </Button>
                        
                    </div>
                    
                    <div className='me-2'>
                        <Button

                            variant="outlined"
                            startIcon={<BsFiletypeCsv size={20} />}
                            onClick={handleExport}
                            sx={{ fontSize: 13, color: 'primary.main', textTransform: 'none', wordBreak: 'break-all' }}
                        >
                            {isDownloading ? (
                                <CircularProgress size={20} color="inherit" />
                            ) : (
                                "Download (All Records) CSV"
                            )}

                        </Button>
                    </div>

                    <div className=''>

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



                

            

     <div className='col-12 p-0'>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            ) : (
                <div style={{ width: '100%', height: 'calc(100vh - 170px)' }}>
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
        </div>
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


export default MemberDataGrid;