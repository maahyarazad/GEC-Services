import React, { useEffect, useState, useCallback } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, CircularProgress, Tooltip, Button, Typography } from '@mui/material';
import { BsFiletypeCsv } from "react-icons/bs";
import { FaCircleCheck } from "react-icons/fa6";
import MessageModalTrigger from '../utils/MessageModalTrigger';
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
                <Tooltip title="Modified">
                    <FaCircleCheck size={16} color="#28a745" /> {/* Bootstrap green */}
                </Tooltip>
            ) : null;
        }
    },
    { field: 'event', headerName: 'Event', width: 130, filterable: true },
    { field: 'firstName', headerName: 'Firstname', width: 130, filterable: true },
    { field: 'lastName', headerName: 'Lastname', width: 130, filterable: true },
    { field: 'email', headerName: 'Email', width: 160, filterable: true },
    { field: 'phone', headerName: 'Phone', width: 150, filterable: true },
    { field: 'whatsapp', headerName: 'WhatsApp', width: 150, filterable: true },
    { field: 'gender', headerName: 'Gender', width: 100, filterable: true },
    {
        field: 'company_data',
        headerName: 'Company Data',
        width: 200,
        filterable: false,
        renderCell: (params) => {
            const data = params?.row?.company_data;

            if (!data) return null;

            let company;
            try {
                company = typeof data === "string" ? JSON.parse(data) : data;
            } catch (e) {
                return <span>Invalid JSON</span>;
            }

            // Small preview text inside the cell
            const preview = company.company_partnerName || company.company_partnerBrand || "Company Data";

            // Tooltip content (full details)
            const content = (
                <Box sx={{ fontSize: 12, lineHeight: 1.5, p: 1, maxWidth: 300 }}>
                    <Typography><strong>Brand:</strong> {company.company_partnerBrand || '-'}</Typography>
                    <Typography><strong>Name:</strong> {company.company_partnerName || '-'}</Typography>
                    <Typography><strong>City/Country:</strong> {company.company_cityCountry || '-'}</Typography>
                    <Typography><strong>Phone:</strong> {company.company_phone || '-'}</Typography>
                    <Typography><strong>Mobile:</strong> {company.company_mobile || '-'}</Typography>
                    <Typography><strong>Email:</strong> {company.company_email || '-'}</Typography>
                    <Typography><strong>Website:</strong> {company.company_website || '-'}</Typography>
                    <Typography><strong>Employees:</strong> {company.company_employeeCount || '-'}</Typography>
                    <Typography><strong>Industry:</strong> {company.company_industry || '-'}</Typography>

                    <Box mt={1}>
                        <Typography><strong>CEO/GM:</strong> {company.company_ceoOwnerGm || '-'}</Typography>
                        <Typography><strong>Contact:</strong> {company.company_ceoOwnerGm_contactNumber || '-'}</Typography>
                        <Typography><strong>Email:</strong> {company.company_ceoOwnerGm_email || '-'}</Typography>
                    </Box>

                    <Box mt={1}>
                        <Typography><strong>HR:</strong> {company.company_hrHead || '-'}</Typography>
                        <Typography><strong>Contact:</strong> {company.company_hrHead_contactNumber || '-'}</Typography>
                        <Typography><strong>Email:</strong> {company.company_hrHead_email || '-'}</Typography>
                    </Box>

                    <Box mt={1}>
                        <Typography><strong>Accounting:</strong> {company.company_accountingHead || '-'}</Typography>
                        <Typography><strong>Contact:</strong> {company.company_accountingHead_contactNumber || '-'}</Typography>
                        <Typography><strong>Email:</strong> {company.company_accountingHead_email || '-'}</Typography>
                    </Box>

                    <Box mt={1}>
                        <Typography><strong>Marketing:</strong> {company.company_marketingHead || '-'}</Typography>
                        <Typography><strong>Contact:</strong> {company.company_marketingHead_contactNumber || '-'}</Typography>
                        <Typography><strong>Email:</strong> {company.company_marketingHead_email || '-'}</Typography>
                    </Box>

                    <Box mt={1}>
                        <Typography><strong>PA:</strong> {company.company_pa || '-'}</Typography>
                        <Typography><strong>Contact:</strong> {company.company_pa_contactNumber || '-'}</Typography>
                        <Typography><strong>Email:</strong> {company.company_pa_email || '-'}</Typography>
                    </Box>
                </Box>
            );

            return (
                <Tooltip title={content} arrow placement="right" enterDelay={500}>
                    <span style={{ cursor: "pointer", color: "#1976d2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {preview}
                    </span>
                </Tooltip>
            );
        },
    },
    { field: 'birthday', headerName: 'Birthday', width: 100, filterable: true },
    { field: 'event_id', headerName: 'Event ID', width: 100, filterable: true },
    {
        field: 'message',
        headerName: 'Message',
        width: 120,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
            const filename = params?.row?.message;
            if (!filename) return null;

            return <MessageModalTrigger message={filename} />;
        }
    },

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

export const RegistrationDataGrid = () => {
    const defaultSortModel = [{ field: 'id', sort: 'desc' }];

    const [registrationList, setRegistrationList] = useState([]);
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
    }, [])

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
