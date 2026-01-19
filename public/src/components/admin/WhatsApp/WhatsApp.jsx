
import { useEffect, useRef, useState, useCallback } from "react";
import { FaWhatsapp } from "react-icons/fa";
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { Switch, IconButton, Paper } from "@mui/material";
import { Button } from '@mui/material'
import Modal from '../../Modal';
import SlideMenu from '../../SlideMenu/SlideMenu';
import { DataGrid } from '@mui/x-data-grid';
import FilterParams from '../../admin/FilterParams';
import JSONPretty from 'react-json-pretty';
import 'react-json-pretty/themes/monikai.css'; // optional styling
import { useSnackbar } from '../../Providers/Snackbar';
import { IoMdAdd } from "react-icons/io";
import { TiDelete } from "react-icons/ti";
import { RiContactsBook2Fill } from "react-icons/ri";
import { IoMdOpen } from "react-icons/io";
import { RiUserReceivedFill } from "react-icons/ri";
import { RiCheckDoubleFill } from "react-icons/ri";

const columns = ({ onViewJson }) => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'metadata_createdAt', headerName: 'Created At', width: 160, filterable: true },
    {
        field: 'To',
        headerName: 'To',
        width: 150,
        filterable: false,
        sortable: false,
        renderCell: (params) => {
            const log = JSON.parse(params.row.response);

            return (
                <>{log.To.replace("whatsapp:", "")}</>
            );
        },

    },
    {
        field: 'MessageStatus',
        headerName: 'MessageStatus',
        width: 150,
        filterable: false,
        sortable: false,
        renderCell: (params) => {
            const log = JSON.parse(params.row.response);

            return (
                <>{log.MessageStatus}</>
            );
        },

    },

    {
        field: 'response',
        headerName: 'Log',
        width: 30,

        filterable: true,
        renderCell: (params) => {
            let json;

            try {

                json =
                    typeof params.row.response === 'string'
                        ? JSON.parse(params.row.response)
                        : params.row.response;
            } catch (e) {
                // Fallback if invalid JSON
                json = { raw: params.row.response };
            }

            return (
                <div>

                    <IconButton onClick={() => onViewJson(params.row.response)}>
                        <IoMdOpen />
                    </IconButton>
                </div>
            );
        },

    }




];


const responseColumns = ({ onViewJson }) => [
    // { field: 'id', headerName: 'ID', width: 70 },
    { field: 'received_at', headerName: 'received_at', width: 160, filterable: true },
    {
        field: '___',
        headerName: 'MessageType',
        width: 100,
        filterable: false,
        renderCell: (params) => {
            let json;
            try {

                json =
                    typeof params.row.payload === 'string'
                        ? JSON.parse(params.row.payload)
                        : params.row.payload;
            } catch (e) {
                // Fallback if invalid JSON
                json = { raw: params.row.payload };
            }

            return (
                <div >
                    {json['MessageType']}
                </div>
            );
        },

    },
    // { field: 'event_type', headerName: 'event_type', width: 160, filterable: true },

    {
        field: '_',
        headerName: 'Body',
        width: 200,
        filterable: false,
        renderCell: (params) => {
            let json;
            try {

                json =
                    typeof params.row.payload === 'string'
                        ? JSON.parse(params.row.payload)
                        : params.row.payload;
            } catch (e) {
                // Fallback if invalid JSON
                json = { raw: params.row.payload };
            }

            return (
                <div >
                    {json['Body']}
                </div>
            );
        },

    },

    {
        field: '__',
        headerName: 'ProfileName',
        width: 200,
        filterable: false,
        renderCell: (params) => {
            let json;
            try {

                json =
                    typeof params.row.payload === 'string'
                        ? JSON.parse(params.row.payload)
                        : params.row.payload;
            } catch (e) {
                // Fallback if invalid JSON
                json = { raw: params.row.payload };
            }

            return (
                <div >
                    {json['ProfileName']}
                </div>
            );
        },

    },

    {
        field: '____',
        headerName: 'Sender Phone Number',
        width: 200,
        filterable: false,
        renderCell: (params) => {
            let json;
            try {

                json =
                    typeof params.row.payload === 'string'
                        ? JSON.parse(params.row.payload)
                        : params.row.payload;
            } catch (e) {
                // Fallback if invalid JSON
                json = { raw: params.row.payload };
            }

            return (
                <div >
                    {json['WaId']}
                </div>
            );
        },

    },

    {
        field: 'payload',
        headerName: 'Response',
        width: 90,

        filterable: true,
        renderCell: (params) => {
            let json;

            try {

                json =
                    typeof params.row.payload === 'string'
                        ? JSON.parse(params.row.payload)
                        : params.row.payload;
            } catch (e) {
                // Fallback if invalid JSON
                json = { raw: params.row.payload };
            }

            return (
                <div>
                    {/*  */}
                    <IconButton onClick={() => onViewJson(params.row.payload)}>
                        <IoMdOpen />
                    </IconButton>
                </div>
            );
        },

    }

];

const contactBookColumn = () => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'type', headerName: 'type', width: 160, filterable: true },
    { field: 'title', headerName: 'title', width: 160, filterable: true },
    { field: 'first_name', headerName: 'first_name', width: 160, filterable: true },
    { field: 'last_name', headerName: 'last_name', width: 160, filterable: true },
    { field: 'phone', headerName: 'phone', width: 160, filterable: true },
    { field: 'club_partner_name', headerName: 'club_partner_name', width: 160, filterable: true },
    { field: 'gender', headerName: 'gender', width: 160, filterable: true },
    { field: 'blacklist', headerName: 'blacklist', width: 160, filterable: true }

];

const tabstyle = {
    backgroundColor: "#00000",      // background of the header
    color: "#fffff",                // text color
    "& .MuiAccordionSummary-expandIconWrapper": {
        color: "#fffff",             // icon color
    },
    '&.Mui-expanded': {
        bgcolor: '#037bfc',
        '& .MuiTypography-root': {
            color: '#fff',   // text color when expanded
        },
        '& .MuiSvgIcon-root': {
            color: '#fff',   // expand icon color when expanded
        },
    },

}



function normalizePhone(input) {
    // Remove everything except digits and plus
    let val = input.replace(/[^0-9+]/g, '');
    // Allow '+' only at the start
    val = val.replace(/(?!^\+)\+/g, '');
    return val;
}




const WhatsappBroadcast = () => {

    const [data, setData] = useState();
    const [groupedByTypeKey, setGroupedByTypeKey] = useState();
    const [content, setContent] = useState(null);
    const [openLogs, setOpenLogs] = useState(false);
    const [openContactBook, setOpenContactBook] = useState(false);
    const [openResponses, setOpenResponses] = useState(false);
    const [loading, setLoading] = useState(true);
    const [viewJsonModal, setViewJsonModal] = useState(false);
    const [JSON_Value_Response_Log, setJSON_Value_Response_Log] = useState(null);
    const [testAction, setTestAction] = useState(false);
    const [massAction, setMassAction] = useState(false);
    const [inputValue, setInputValue] = useState({});
    const [phone, SetPhone] = useState(null);
    const [loadingMassSend, SetloadingMassSend] = useState(false);
    const [phoneList, SetPhoneList] = useState([]);
    const [contactList, setContactList] = useState([]);
    const [useContactBook, setUseContactBook] = useState(false);

    const { showSnackbar } = useSnackbar();

    const fetchData = useCallback(async () => {
        try {


            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/whatsapp/list`, { credentials: "include" });


            if (response.status === 200) {
                const response_data = await response.json();
                setData(response_data.templates);




            }
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setLoading(false);
        }
    },

        []
    );


    const fetchContactData = useCallback(async () => {
        try {

            setloading_logs(true)
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/contacts`, { credentials: "include" });


            if (response.status === 200) {
                const response_data = await response.json();

                setContactList(response_data.data);




            }
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setloading_logs(false)
        }
    },

        []
    );



    useEffect(() => {

        fetchData();
    }, [fetchData]);




    const onViewJson = (value) => {
        debugger;
        setViewJsonModal(true);
        setJSON_Value_Response_Log(value);
    }

    useEffect(() => { }, [viewJsonModal])
    useEffect(() => {
        if (data) {
            const _groupedByTypeKey = data.reduce((acc, obj) => {
                if (!obj.types) return acc;

                Object.keys(obj.types).forEach((typeKey) => {
                    if (!acc[typeKey]) {
                        acc[typeKey] = [];
                    }
                    acc[typeKey].push(obj);
                });

                return acc;
            }, {});
            setGroupedByTypeKey(_groupedByTypeKey);
        }

    }, [data]);



    const handleSubmit = async (e) => {
        e.preventDefault();
        SetloadingMassSend(true);
        try {

            const requiredKeys = content?.variables
                ? Object.keys(content.variables)
                : [];

            for (const key of requiredKeys) {
                if (!inputValue[key] || inputValue[key].trim() === "") {
                    alert(`Please fill Variable ${key}`);
                    return;
                }
            }



            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/whatsapp/send`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        useContactBook: useContactBook,
                        phoneList,
                        payload: inputValue,
                        template: content,
                    }),
                }
            );

            if (response.ok) {
                const responseData = await response.json();
                showSnackbar(responseData.message, "success");
                setTestAction(false);
            } else {
                const errorData = await response.json();
                showSnackbar(errorData.message || "Failed to send message", "error");
            }
        } catch (error) {
            console.error("Failed to send:", error);
            showSnackbar("Unexpected error occurred", "error");
        } finally {
            SetloadingMassSend(false);
            SetPhoneList([]);
        }
    };


    /////////////////////////////////  LOGS   //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////

    const defaultSortModel = [{ field: 'id', sort: 'desc' }];
    const [rowCount, setRowCount] = useState(0);
    const [loading_logs, setloading_logs] = useState(false);
    const [sortModel, setSortModel] = useState(defaultSortModel);
    const [filterModel, setFilterModel] = useState({
        items: [],
    });
    const [applyFilterTrigger, setApplyFilterTrigger] = useState(0);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
    const [logs, setLogs] = useState([]);
    const [responses, setResponses] = useState([]);

    const fetchResponses = useCallback(
        async (paginationModel, sortModel = [], filterModel = { items: [] }) => {
            setloading_logs(true);
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

                const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/whatsapp/twilio-response-logs?${queryParams}`, { credentials: "include" });

                const data = await response.json();

                setResponses(data.data || []);
                setRowCount(data.total || 0);
            } catch (err) {
                console.error('Failed to fetch:', err);
            } finally {
                setloading_logs(false);
            }
        },
        []
    );

    const fetchLogs = useCallback(
        async (paginationModel, sortModel = [], filterModel = { items: [] }) => {
            setloading_logs(true);
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

                const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/whatsapp/twilio-delivery-logs?${queryParams}`, { credentials: "include" });

                const data = await response.json();

                setLogs(data.data || []);
                setRowCount(data.total || 0);
            } catch (err) {
                console.error('Failed to fetch:', err);
            } finally {
                setloading_logs(false);
            }
        },
        []
    );

    useEffect(() => {
        if (openLogs) fetchLogs(paginationModel, sortModel, filterModel);
        if (openResponses) fetchResponses(paginationModel, sortModel, filterModel);
        if (openContactBook) fetchContactData();

    }, [openLogs, openResponses, openContactBook, paginationModel, sortModel, applyFilterTrigger]);


    ////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////


    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '80%' }}>
                <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                    <CircularProgress />
                </Box>
            </div>
        );
    }

    return (

        <Box sx={{ padding: 1, position: 'relative' }}>
            <SlideMenu
                isOpen={openLogs || openResponses}
                onClose={() => {
                    setOpenLogs(false);
                    setOpenResponses(false);

                }}
                headerTitle={openLogs ? 'Delivery Logs' : 'Responses Logs'}
            >


                {loading_logs ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {openLogs && (
                            <div style={{ width: '100%', height: 'calc(100vh - 105px)' }}>
                                <DataGrid
                                    rows={logs}
                                    columns={columns({ onViewJson })}
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

                        {openResponses && (
                            <div style={{ width: '100%', height: 'calc(100vh - 105px)' }}>
                                <DataGrid
                                    rows={responses}
                                    columns={responseColumns({ onViewJson })}
                                    rowCount={rowCount}
                                    // rowHeight={100}
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


                    </>
                )}



            </SlideMenu>

            <SlideMenu id={'contact-book'}
                isOpen={openContactBook}
                onClose={() => {

                    setOpenContactBook(false);
                }}
                headerTitle={'Contact Book'}
            >


                {loading_logs ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>


                        {openContactBook && (
                            <div style={{ width: '100%', height: 'calc(100vh - 105px)' }}>
                                <DataGrid
                                    rows={contactList}
                                    columns={contactBookColumn()}
                                    
                                    pageSizeOptions={[25, 50, 100]}
                                    initialState={{
                                        pagination: {
                                            paginationModel: {
                                                pageSize: 25,
                                                page: 0,
                                            },
                                        },
                                    }}
                                    disableRowSelectionOnClick
                                    disableSelectionOnClick
                                    showToolbar
                                />

                            </div>
                        )}
                    </>
                )}



            </SlideMenu>


            <Modal isOpen={viewJsonModal}
                onRequestClose={() => {
                    setViewJsonModal(false);
                    setJSON_Value_Response_Log(null);
                }}

                title={`Twilio Json Log`}>
                <JSONPretty data={JSON_Value_Response_Log} />
            </Modal>


            {/* <Button variant="contained" color="primary" size="small" sx={{ textTransform: 'none', marginRight: 1 }} onClick={() => { setTestAction(true); }} disabled={content === null}>
                <FaWhatsapp size={17} style={{ marginRight: 10 }} /> Test Message
            </Button> */}
            <Button variant="contained" color="primary" size="small" sx={{ textTransform: 'none', marginRight: 1 }} onClick={() => { setMassAction(true); }} disabled={content === null}>
                <FaWhatsapp size={17} style={{ marginRight: 2 }} /> Send Message
            </Button>
            <Button variant="outlined" color="primary" size="small" sx={{ textTransform: 'none', marginRight: 1 }} onClick={() => setOpenContactBook(true)}>
                <RiContactsBook2Fill size={17} style={{ marginRight: 2 }} />
                Contact Book
            </Button>
            <Button variant="outlined" color="primary" size="small" sx={{ textTransform: 'none', marginRight: 1 }} onClick={() => setOpenResponses(true)}>
                <RiUserReceivedFill style={{ marginRight: 2 }} />
                Response Logs
            </Button>
            <Button variant="outlined" color="primary" size="small" sx={{ textTransform: 'none', marginRight: 1 }} onClick={() => setOpenLogs(true)}>
                <RiCheckDoubleFill style={{ marginRight: 2 }} />
                Delivery Logs
            </Button>
            <div style={{ height: 'calc(100vh - 155px)', overflow: 'scroll' }} >
                <div className="mt-2">

                    <div className="row m-0">

                        <div className="col-lg-4 col-12">
                            {groupedByTypeKey && Object.keys(groupedByTypeKey).length > 0 ? (
                                Object.keys(groupedByTypeKey).map((key) => (
                                    <Accordion key={key}>
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            aria-controls="panel2-content"
                                            id="panel2-header"
                                            sx={tabstyle}
                                        >
                                            <Typography component="span">{key.charAt(0).toUpperCase() + key.slice(1)}</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <div className="d-flex">
                                                <div className="col form-control">
                                                    {Object.values(groupedByTypeKey[key]).map((item, idx) => (
                                                        <div key={idx} onClick={() => { setInputValue({}); setContent(item); console.log(item) }}
                                                            style={{ border: 'solid', borderRadius: '5px', borderColor: 'gray', borderWidth: '1px', padding: '5px', marginBottom: '5px', cursor: 'pointer' }}>

                                                            <strong>{item.friendlyName}</strong> ({item.language})<br />
                                                            SID: <small style={{ fontSize: '15px' }}>{item.sid}</small><br />
                                                            Created: {new Date(item.dateCreated).toLocaleString()}<br />
                                                            Updated: {new Date(item.dateUpdated).toLocaleString()}<br />
                                                            URL: <a href={item.url} target="_blank" rel="noopener noreferrer">View in Twilio</a>

                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </AccordionDetails>
                                    </Accordion>
                                ))
                            ) : (
                                <Typography>No data available</Typography>
                            )}
                        </div>
                        <div className="col-lg-8 col-12">

                            {content && content.types ? (
                                (() => {
                                    const typeKey = Object.keys(content.types)[0];
                                    const data = content.types[typeKey];

                                    switch (typeKey) {
                                        case "whatsapp/authentication": {
                                            const { body, actions, add_security_recommendation } = data;
                                            return (
                                                <Paper sx={{ p: 2 }} elevation={5}>
                                                    <Typography variant="h6">{content?.friendlyName}</Typography>
                                                    <Typography sx={{ my: 2 }}>{body.replace("{{1}}", "123456")}</Typography>
                                                    {actions?.map((action, i) => {
                                                        if (action.type === "COPY_CODE") {

                                                            return (
                                                                <div key={i}>

                                                                    <Button variant="contained" color="primary" sx={{ textTransform: 'none' }}

                                                                        onClick={() => navigator.clipboard.writeText("123456")}
                                                                        style={{ padding: "8px 16px", cursor: "pointer" }}
                                                                    >
                                                                        {action.copy_code_text}
                                                                    </Button>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                    {add_security_recommendation && (
                                                        <Typography color="error" sx={{ mt: 2 }}>
                                                            Please add security recommendations.
                                                        </Typography>
                                                    )}
                                                </Paper>
                                            );
                                        }

                                        case "twilio/list-picker": {
                                            const { body, button, items } = data;
                                            return (
                                                <Paper sx={{ p: 2 }} elevation={5}>
                                                    <Typography variant="h6">{content?.friendlyName}</Typography>
                                                    <Typography sx={{ my: 2 }}>
                                                        {body.replace("{{order_number}}", "12345").replace("{{date}}", "Jan 10")}
                                                    </Typography>
                                                    <ul style={{ listStyle: "none", padding: 0 }}>
                                                        {items.map(({ id, item, description }) => (
                                                            <li
                                                                key={id}
                                                                style={{
                                                                    marginBottom: 10,
                                                                    padding: 10,
                                                                    background: "#f0f0f0",
                                                                    borderRadius: 4,
                                                                }}
                                                            >
                                                                <strong>{item}</strong>
                                                                <div style={{ fontSize: 12, color: "#555" }}>{description}</div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <Button variant="contained" color="primary" sx={{ textTransform: 'none' }}>
                                                        {button}
                                                    </Button>
                                                </Paper>
                                            );
                                        }

                                        case "twilio/text": {
                                            const { body } = data;
                                            return (
                                                <Paper sx={{ p: 2 }} elevation={5}>
                                                    <Typography variant="h6">Twilio Text</Typography>
                                                    <Typography sx={{ my: 2 }}>{body.replace("{{1}}", "User")}</Typography>
                                                </Paper>
                                            );
                                        }

                                        case "twilio/media": {
                                            const { body, media } = data;
                                            return (
                                                <Paper sx={{ p: 2 }} elevation={5}>
                                                    <Typography variant="h6">{content?.friendlyName}</Typography>
                                                    <Typography sx={{ my: 2 }}>{body}</Typography>
                                                    {media?.map((url, idx) => (
                                                        <img
                                                            key={idx}
                                                            src={url}
                                                            alt={`media-${idx}`}
                                                            style={{ maxWidth: "100%", marginBottom: 10, borderRadius: 4 }}
                                                        />
                                                    ))}
                                                </Paper>
                                            );
                                        }

                                        case "twilio/card": {
                                            const { title, subtitle, body, media, actions, orientation } = data;
                                            return (
                                                <Paper sx={{ p: 2, maxWidth: 400, border: "1px solid #ccc", borderRadius: 4 }}>
                                                    <Typography variant="h5">{content?.friendlyName}</Typography>
                                                    {subtitle && <Typography variant="subtitle1" color="text.secondary">{subtitle}</Typography>}
                                                    {media?.length > 0 && (
                                                        <img
                                                            src={media[0]}
                                                            alt="card media"
                                                            style={{
                                                                width: "100%",
                                                                height: orientation === "VERTICAL" ? 200 : 100,
                                                                objectFit: "cover",
                                                                borderRadius: 4,
                                                                marginTop: 8,
                                                                marginBottom: 8,
                                                            }}
                                                        />
                                                    )}
                                                    {body && <Typography sx={{ my: 1 }}>{body}</Typography>}
                                                    {actions?.length > 0 && (
                                                        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                                                            {actions.map((action, i) => (
                                                                <div key={action}>

                                                                    <Button variant="contained" color="primary" sx={{ textTransform: 'none' }}>

                                                                        {action.title || action.label || "Action"}
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </Box>
                                                    )}
                                                </Paper>
                                            );
                                        }

                                        case "twilio/quick-reply": {
                                            console.log(data);
                                            const { body, actions, title } = data;
                                            return (
                                                <Paper sx={{ p: 2 }} elevation={5}>
                                                    <Typography variant="h6">{content?.friendlyName}</Typography>
                                                    <Typography sx={{ my: 2 }}>{body}</Typography>
                                                    <Box sx={{ display: "flex", gap: 1 }}>
                                                        {actions?.map(({ id, title }) => (
                                                            <div key={id}>
                                                                <Button variant="contained" color="primary" sx={{ textTransform: 'none' }}
                                                                    onClick={() => alert(`You clicked: ${title}`)}>

                                                                    {title}
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </Box>
                                                </Paper>
                                            );
                                        }

                                        case "twilio/call-to-action": {
                                            const { body, actions } = data;
                                            return (
                                                <Paper sx={{ p: 2 }} elevation={5}>
                                                    <Typography variant="h6">{content?.friendlyName}</Typography>
                                                    <Typography sx={{ my: 2 }}>{body.replace("{{first_name}}", "John")}</Typography>
                                                    <Box sx={{ display: "flex", gap: 1 }}>
                                                        {actions?.map((action, i) => {
                                                            if (action.type === "URL" && action.url) {
                                                                return (
                                                                    <div key={i}>

                                                                        <Button variant="contained" color="primary" sx={{ textTransform: 'none' }}


                                                                            onClick={() => window.open(action.url, "_blank", "noopener noreferrer")}
                                                                        >
                                                                            {action.title}
                                                                        </Button>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })}
                                                    </Box>
                                                </Paper>
                                            );
                                        }

                                        default:
                                            return <Typography>Unsupported template type: {typeKey}</Typography>;
                                    }
                                })()
                            ) : (
                                <Typography>Select a template to preview</Typography>
                            )}
                        </div>
                    </div>
                </div>

            </div>


            <Modal isOpen={massAction}
                onRequestClose={() => { setTestAction(false); setMassAction(false) }}
                title={`Test Message → ${content?.friendlyName}`}>

                <div className="ps-3">
                    <label htmlFor="test-input">Use Contact Book</label>


                    <Switch
                        size="small"
                        title="Use Contact Book"
                        checked={useContactBook}
                        onChange={(e) => setUseContactBook(e.target.checked)}
                        color="primary"

                    />


                    <form onSubmit={handleSubmit} >


                        <div className="row">

                            <div className={`col-4 p-0 m-0${Object.keys(content?.variables ?? {}).length === 0 ? "d-none" : ""}`}>

                                <div className="p-2">

                                    {/* <label htmlFor="test-input">Recipient phone number:</label>
                                <input
                                    id="test-input"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => SetPhone(e.target.value.replace())}
                                    placeholder="+971501234567"
                                    pattern="^\+?[0-9]{7,15}$" // allows optional + and 7-15 digits
                                    required

                                /> */}

                                    {content?.variables && Object.keys(content.variables).map((key) => (
                                        <div key={key}>
                                            <label htmlFor={`variable-${key}`}>Variable {key}</label>

                                            <input
                                                id={`variable-${key}`}
                                                type="text"
                                                value={inputValue[key] || ""}
                                                onChange={(e) =>
                                                    setInputValue((prev) => ({
                                                        ...prev,
                                                        [key]: e.target.value,
                                                    }))
                                                }
                                                placeholder={content.variables[key]}
                                                required
                                            />
                                        </div>
                                    ))}



                                </div>
                            </div>


                            <div className={`col-8 p-0 m-0 ${massAction ? "" : "d-none"} ${useContactBook ? "d-none" : ""}`}>
                                <div className="d-flex flex-column justify-content-start p-2">

                                    <div>

                                        <label htmlFor="test-input">Recipient phone number:</label>
                                        <input
                                            id="test-input"
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => SetPhone(normalizePhone(e.target.value))}
                                            placeholder="+971501234567"
                                            pattern="^\+?[0-9]{7,15}$" // allows optional + and 7-15 digits


                                        />
                                        <IconButton onClick={() => {
                                            if (!phone) return;
                                            SetPhoneList((prev) => [
                                                ...prev,
                                                { id: Date.now().toString(), phone: normalizePhone(phone) }
                                            ]);
                                            SetPhone('');
                                        }}
                                        >
                                            <IoMdAdd />
                                        </IconButton>
                                    </div>
                                </div>

                                <ul>

                                    {phoneList.map(({ id, phone }) => (
                                        <li key={id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>{phone}</span>
                                            <IconButton
                                                type="button"
                                                onClick={() => {
                                                    SetPhoneList((prev) => prev.filter(item => item.id !== id));
                                                }}
                                            >
                                                <TiDelete color="red" />
                                            </IconButton>
                                        </li>
                                    ))}
                                </ul>


                            </div>






                            <div
                                className={`col-8 m-0 p-0 ${useContactBook ? "" : "d-none"}`}
                                style={{ padding: "0" }}
                            >
                                <div className="p-0">

                                    <p >
                                        When you want to send personalized WhatsApp messages, you can tell the system which information to include for each person by typing special keywords separated by spaces.
                                    </p>

                                    <p>
                                        For example, if you type <code>"first_name last_name"</code> in a field, the message will include the person’s first name and last name together.
                                    </p>

                                    <p><strong>Here are the keywords you can use:</strong></p>

                                    <ul>
                                        <li><code>id</code> — The person’s unique ID</li>
                                        <li><code>title</code> — Their title (like Mr., Ms., Dr.)</li>
                                        <li><code>first_name</code> — Their first name</li>
                                        <li><code>last_name</code> — Their last name</li>
                                        <li><code>gender</code> — Their gender</li>
                                        <li><code>phone</code> — Their phone number</li>
                                        <li><code>type</code> — Their contact type (like member, partner)</li>
                                        <li><code>club_partner_name</code> — The name of their club or partner</li>
                                        <li><code>blacklist</code> — Whether they are blacklisted or not</li>
                                    </ul>

                                    <p>
                                        You can combine any of these by typing them with spaces in between, like <code>"first_name last_name title"</code>.
                                    </p>
                                </div>
                            </div>


                            <div className="row">

                                <div className="col-12 m-0 p-0">

                                    <Button variant="contained"
                                        color="primary" sx={{ textTransform: 'none', width: '100%' }} type="submit"
                                        disabled={useContactBook ? !true : phoneList.length === 0}
                                        startIcon={
                                            loadingMassSend ? (
                                                <CircularProgress size={20} color="inherit" />
                                            ) : (
                                                <></>
                                            )
                                        }
                                    >
                                        Send Message

                                    </Button>
                                </div>
                            </div>
                        </div>


                    </form>
                </div>



            </Modal>

        </Box>





    );
};



export default WhatsappBroadcast;