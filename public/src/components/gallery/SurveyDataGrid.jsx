import { useEffect, useState, useCallback } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, CircularProgress, Button, Tooltip } from '@mui/material';
import { BsFiletypeCsv } from "react-icons/bs";
import {config} from '../../ui_config';
import FilterParams from '../admin/FilterParams';

const PAGE_SIZE = 10;

const columns = [
  { field: 'id', headerName: 'ID', width: 60 },
  { field: 'event', headerName: 'Event', width: 130, filterable: true },

  { field: 'partnerBrand', headerName: 'Partner Brand', width: 160, filterable: true },
  { field: 'partnerName', headerName: 'Partner Name', width: 160, filterable: true },
  { field: 'cityCountry', headerName: 'City / Country', width: 160, filterable: true },
  { field: 'phone', headerName: 'Phone', width: 150, filterable: true },
  { field: 'mobile', headerName: 'Mobile', width: 150, filterable: true },
  { field: 'email', headerName: 'Email', width: 180, filterable: true },
  { field: 'website', headerName: 'Website', width: 180, filterable: true },
  { field: 'employeeCount', headerName: 'Employee Count', width: 150, filterable: true },
  { field: 'industry', headerName: 'Industry', width: 160, filterable: true },

  { field: 'ceoOwnerGm', headerName: 'CEO / Owner / GM', width: 180, filterable: true },
  { field: 'ceoOwnerGm_contactNumber', headerName: 'CEO Contact Number', width: 180, filterable: true },
  { field: 'ceoOwnerGm_landline', headerName: 'CEO Landline Number', width: 180, filterable: true },
  { field: 'ceoOwnerGm_email', headerName: 'CEO Email', width: 180, filterable: true },

  { field: 'pa', headerName: 'PA', width: 160, filterable: true },
  { field: 'pa_contactNumber', headerName: 'PA Contact Number', width: 180, filterable: true },
  { field: 'pa_landline', headerName: 'PA Landline Number', width: 180, filterable: true },
  { field: 'pa_email', headerName: 'PA Email', width: 180, filterable: true },

  { field: 'hrHead', headerName: 'HR Head', width: 160, filterable: true },
  { field: 'hrHead_contactNumber', headerName: 'HR Contact Number', width: 180, filterable: true },
  { field: 'hrHead_landline', headerName: 'HR Landline Number', width: 180, filterable: true },
  { field: 'hrHead_email', headerName: 'HR Email', width: 180, filterable: true },

  { field: 'accountingHead', headerName: 'Accounting Head', width: 180, filterable: true },
  { field: 'accountingHead_contactNumber', headerName: 'Accounting Contact Number', width: 200, filterable: true },
  { field: 'accountingHead_landline', headerName: 'Accounting Landline Number', width: 200, filterable: true },
  { field: 'accountingHead_email', headerName: 'Accounting Email', width: 180, filterable: true },

  { field: 'marketingHead', headerName: 'Marketing Head', width: 180, filterable: true },
  { field: 'marketingHead_contactNumber', headerName: 'Marketing Contact Number', width: 200, filterable: true },
  { field: 'marketingHead_landline', headerName: 'Marketing Landline Number', width: 200, filterable: true },
  { field: 'marketingHead_email', headerName: 'Marketing Email', width: 180, filterable: true },


  { field: 'createdAt', headerName: 'Created At', width: 200, filterable: true },
  { field: 'modifiedAt', headerName: 'Modified At', width: 200, filterable: true },

  { field: 'event_id', headerName: 'Event ID', width: 100, filterable: true }
];



export const SurveyDataGrid = () => {
    const defaultSortModel = [{ field: 'id', sort: 'desc' }];

    const [surveyList, setSurveyList] = useState([]);
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
            const filterParams = FilterParams(filterModel);

            const queryParams = [
                `page=${paginationModel.page + 1}`,
                `pageSize=${paginationModel.pageSize}`,
                sortField ? `sortField=${sortField}` : '',
                sortOrder ? `sortOrder=${sortOrder}` : '',
                filterParams
            ].filter(Boolean).join('&');

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/survey?${queryParams}`,{credentials:"include"});
            const response_data = await response.json();

            setSurveyList(response_data.data || []);
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

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/survey-csv-data`,{credentials:"include"});
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
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            ) : (

                <div style={{ width: '100%', height: '82dvh' }}>
                    <DataGrid
                        rows={surveyList}
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
        </Box>
    );
};
