import { useEffect, useState, useCallback } from 'react';
import {DataGrid} from '@mui/x-data-grid';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

import {BsFiletypeCsv} from 'react-icons/bs';
import {IoTrashOutline} from 'react-icons/io5';
import {FaRegEdit} from 'react-icons/fa';

import { config } from '../../ui_config';
import FilterParams from '../Dashboard/FilterParams';

import { useAlertDialog } from '../Providers/AlertProvider';
import { useSnackbar } from '../Providers/Snackbar';
import { useSlideModal } from '../Providers/SlideModalProvider';

import {SurveyTemplateForm} from '../templates/SurveyTemplateForm';


import { Form, Formik } from 'formik';

const PAGE_SIZE = 10;

const getColumns = ({ onEdit, onDelete }) => [
    { field: 'id', headerName: 'ID', width: 60 },
    {
        field: 'actions',
        headerName: 'Actions',
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => {


            return (

                <Box>

                    <IconButton
                        title="Edit"
                        onClick={() => onEdit(params.row)}
                    >
                        <FaRegEdit color="dark" size={18} />
                    </IconButton>




                    <IconButton onClick={() => onDelete(params.row)} title="Delete record">
                        <IoTrashOutline color="red" size={18} />
                    </IconButton>

                </Box>
            )
        }
    },
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



const SurveyDataGrid = () => {
    const defaultSortModel = [{ field: 'id', sort: 'desc' }];
    const { openDialog } = useAlertDialog();
    const { showSnackbar } = useSnackbar();
    const { openModal, closeModal } = useSlideModal();
    const [surveyList, setSurveyList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isDownloading, setIsDownloadings] = useState(false);
    const [filterModel, setFilterModel] = useState({
        items: [],
    });
    const [applyFilterTrigger, setApplyFilterTrigger] = useState(0);
    // const [editConfig, setEditConfig] = useState(null);
    const [rowCount, setRowCount] = useState(0);
    const [sortModel, setSortModel] = useState(defaultSortModel);
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 25,
    });

    const fetchData = useCallback(async (paginationModel, sortModel = [], filterModel = {}) => {
        setLoading(true);
        try {

            // const config = await fetch(`${import.meta.env.VITE_SERVERURL}/registration-config/optional-login`, {
            //     method: 'POST',
            //     credentials: 'include',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify({page:"partner-contact-update"}),
            // });
    
            // const _configResponse = await config.json();
            // setEditConfig(_configResponse.rows[0]);

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

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/survey?${queryParams}`, { credentials: "include" });



            const response_data = await response.json();


        // if (sortField) {
        //     response_data.data.sort((a, b) => {
        //         debugger;
        //         const aValue = a[sortField]?.toLowerCase() || "";
        //         const bValue = b[sortField]?.toLowerCase() || "";
        //         debugger;
        //         return aValue.localeCompare(bValue, 'en', { sensitivity: 'base' });
        //     });
        // }



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


    const handleEdit = (row) => {
        const _row = {};

        Object.entries(row).map(([k,v])=>{
            const newKey = `company_${k}`;
            _row[newKey] = v;
        })

        

        openModal(`Edit ${row.partnerName}`,
            <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
                <Formik
                    enableReinitialize={true}
                    initialValues={{
                        ..._row
                    }}

                    onSubmit={async (values) => {await editRow(values);}}
                >
                    {({
                        setFieldValue,
                        errors,
                        touched,
                        values,
                        validateForm,
                        setTouched,
                        setFieldTouched
                    }) => (
                        <Form>
                            <SurveyTemplateForm errors={errors} touched={touched} target={row} gridView={true} values={values}/>

                            <Button
                               
                                variant="contained"
                                color="primary"

                                type="submit"
                                style={{
                                    pointerEvents: "auto",
                                    opacity: 1,
                                    width: "100%",
                                    textTransform: "none",
                                }}
                            >
                                Save
                            </Button>
                        </Form>
                    )}
                </Formik>
            </Box>

        );
    }

    const editRow = async (values) => {
        
        
                const _edited = {};

            Object.entries(values).map(([k,v])=>{
                if(k.includes("company_")){
                    const newKey = k.replace("company_", "");
                    _edited[newKey] = v;
                }else{
                    _edited[k] = v;
                }
            })


            try {

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/update-survey`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({data: _edited}),
            });
    
             const respnse_data = await response.json();
            if (!response.ok) {
                showSnackbar(respnse_data.message);
                throw new Error(response.message);
            }
            
            
            if (respnse_data) {
                closeModal();
                showSnackbar(respnse_data.message, 'success');
                
            }


        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            fetchData(paginationModel, sortModel, filterModel);
        }
    };

    const deleteRequest = async (id) => {

        try {



            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/delete-survey?id=${id}`, { credentials: "include" });
            const response_data = await response.json();



        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            fetchData(paginationModel, sortModel, filterModel);
        }
    }

    const handleDelete = (row) => {

        openDialog(
            <>
                Do you want to <strong>delete {row.partnerName} from database</strong>?
                Are you sure you want to proceed?
            </>,
            'Confirm Action',
            {
                text: 'Confirm',
                color: 'error'
            },
            async () => {
                await deleteRequest(row.id)
            },
            () => {

            },
        );
    }

    const handleExport = async () => {
        try {
            setIsDownloadings(true);

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/survey-csv-data`, { credentials: "include" });
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

                <div style={{ width: '100%', height: 'calc(100vh - 175px)' }}>
                    <DataGrid
                        rows={surveyList}
                        columns={getColumns({
                            onEdit: handleEdit,
                            onDelete: handleDelete
                        })}
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

export default SurveyDataGrid;
