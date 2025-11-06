import React, { useEffect, useState, useCallback, useRef } from 'react';
import {DataGrid} from '@mui/x-data-grid';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import {BsFiletypeCsv} from 'react-icons/bs';
import {FaCircleCheck} from 'react-icons/fa6';
import {FcFlashAuto} from 'react-icons/fc';
import {TfiWrite} from 'react-icons/tfi';
import {GrVirtualMachine} from 'react-icons/gr';

import MessageModalTrigger from '../utils/MessageModalTrigger';
import { config } from '../../ui_config';
import FilterParams from '../admin/FilterParams';
import RegistrationConfigSearch from './RegistrationConfigSearch';

const PAGE_SIZE = 10;

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
                <Tooltip componentsProps={config.tooltip_config}
                    title={`Completed at ${modified}`}>
                    <FaCircleCheck size={16} color="#28a745" /> {/* Bootstrap green */}
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
                <Tooltip componentsProps={config.tooltip_config}
                    title={`Payment Id ${params?.row?.id}`}>
                    <FaCircleCheck size={16} color="#28a745" /> {/* Bootstrap green */}
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
            return raw ? (<>{new Date(JSON.parse(raw).selected_time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            })}</>) : (<></>)

        }
    },
    {
        field: 'message',
        headerName: 'Message',
        width: 120,
        sortable: false,
        filterable: true,
        // disableColumnMenu: true,
        renderCell: (params) => {
            const message = params?.row?.message;
            if (!message) return null;
            if (message === "AUTO_REGISTER") return <FcFlashAuto size={16} title='This record has been automatically registered from the Google Sheet.' />;
            if (message === "MANUAL_REGISTER") return <TfiWrite size={16} title="This person has been manually registered for the event." />;
            if (message === "AUTO_MEMBERSHIP_REGISTER") return <GrVirtualMachine color="orange" size={16} title="This person used the virtual membership card at the venue." />;

            return <MessageModalTrigger message={message} />;
        }
    },
    { field: 'event', headerName: 'Event', width: 130, filterable: true },
    { field: 'firstName', headerName: 'Firstname', width: 130, filterable: true },
    { field: 'lastName', headerName: 'Lastname', width: 130, filterable: true },
    { field: 'email', headerName: 'Email', width: 160, filterable: true },
    { field: 'phone', headerName: 'Phone', width: 150, filterable: true },
    { field: 'whatsapp', headerName: 'WhatsApp', width: 150, filterable: true },
    { field: 'gender', headerName: 'Gender', width: 100, filterable: true },
    { field: 'birthday', headerName: 'Birthday', width: 100, filterable: true },
    { field: 'event_id', headerName: 'Event ID', width: 100, filterable: true },


    {
        field: 'attachment_file', headerName: 'Attachment', width: 100, renderCell: (params) => {
            const filename = params?.row?.attachment_file;

            if (filename) {
                const fileUrl = `${import.meta.env.VITE_SERVERURL}/uploads/${filename}`;
                return (
                    <a href={fileUrl} download style={{ textDecoration: 'none' }} target='_black'>
                        <Button variant="contained" className='px-1' color="primary" sx={{ textTransform: 'none', fontSize: 12, padding: 0 }}>
                            Download
                        </Button>
                    </a>
                )

            }
        }
    },
    { field: 'metadata_createdAt', headerName: 'Creation Datetime', width: 160, filterable: true },
    { field: 'metadata_modifiedAt', headerName: 'Last Modified Datetime', width: 160, filterable: true }
];



const RegistrationDataGrid = () => {
    const defaultSortModel = [{ field: 'id', sort: 'desc' }];

    const [registrationList, setRegistrationList] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);

    const [loading, setLoading] = useState(false);
    const [isDownloading, setIsDownloadings] = useState(false);
    const [filterModel, setFilterModel] = useState({
        items: [],
    });
    const [applyFilterTrigger, setApplyFilterTrigger] = useState(0);
    const [rowCount, setRowCount] = useState(0);
    const [sortModel, setSortModel] = useState(defaultSortModel);
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 25,
    });

    const fetchData = useCallback(async (_selectedEvent, paginationModel, sortModel = [], filterModel = {}) => {
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
                filterParams
            ].filter(Boolean).join('&');
            
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/registration?${queryParams}&filter_event=${_selectedEvent}`, { credentials: "include" });
            const response_data = await response.json();

            setRegistrationList(response_data.data || []);
            setRowCount(response_data.total || 0);

        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setLoading(false);
        }
    }, [])

    const handleCheck = (e) => {
        
        setSelectedEvent(e);
    };

    useEffect(() => {
        if (selectedEvent) fetchData(selectedEvent, paginationModel, sortModel, filterModel);

    }, [paginationModel, sortModel, applyFilterTrigger, selectedEvent]);


    const handleExport = async () => {
        try {
            setIsDownloadings(true);

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/registration-csv-data`, { credentials: "include" });

            if (!response.ok) {
                throw new Error('Failed to fetch CSV file');
            }

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
            link.setAttribute('download', fileName); // Set desired file name
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

            <div className='row mb-1'>
                <div className='col-lg-12 d-lg-flex justify-content-between'>
                    <div className="">
                        <Tooltip title="Download CSV data" componentsProps={config.tooltip_config}>
                        </Tooltip>
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

            <div className='row'>
                <div className='col-2'>
                    <RegistrationConfigSearch onSelect={handleCheck} />
                </div>
                <div className='col-10'>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <div style={{ width: '100%', height: '82dvh' }}>

                            <DataGrid
                                rows={registrationList}
                                columns={columns}
                                getRowHeight={(params) => {
                                    const companyData = params?.row?.company_data;

                                    if (companyData) {
                                        return 200;
                                    }
                                    return 52;
                                }}
                                // getRowClassName={(params) =>
                                //     params.row.company_data ? "companyRow" : ""
                                // }
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
                </div>
            </div>
        </Box>
    );
};


export default RegistrationDataGrid;
