
import { useEffect, useRef, useState, useCallback } from "react";
import { FaWhatsapp } from "react-icons/fa";
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { Icon, IconButton, Paper } from "@mui/material";
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

const columns = () => [
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
        field: 'SmsStatus',
        headerName: 'SmsStatus',
        width: 100,
        filterable: false,
        sortable: false,
        renderCell: (params) => {
            const log = JSON.parse(params.row.response);

            return (
                <>{log.SmsStatus}</>
            );
        },

    },

    {
        field: 'response',
        headerName: 'Log',
        width: 1000,

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
                <div style={{ fontSize: 12, height: '115px', overflow: 'scroll' }}>
                    <JSONPretty id={params.row.id} data={json} />
                </div>
            );
        },

    }




];


const responseColumns = () => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'received_at', headerName: 'received_at', width: 160, filterable: true },
    { field: 'source', headerName: 'source', width: 160, filterable: true },
    { field: 'event_type', headerName: 'event_type', width: 160, filterable: true },

     {
        field: 'event_type',
        headerName: 'Message Body',
        width: 1000,

        filterable: true,
        renderCell: (params) => {
            let _json;

            try {

                _json =
                    typeof params.row.payload === 'string'
                        ? JSON.parse(params.row.payload)
                        : params.row.payload;
            } catch (e) {
                // Fallback if invalid JSON
                _json = { raw: params.row.payload };
            }

            return (
                <div style={{ fontSize: 12, height: '115px', overflow: 'scroll' }} id={params.row.id}>
                    {_json.body}
                </div>
            );
        },

    },
    {
        field: 'payload',
        headerName: 'Response',
        width: 1000,

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
                <div style={{ fontSize: 12, height: '115px', overflow: 'scroll' }}>
                    <JSONPretty id={params.row.id} data={json} />
                </div>
            );
        },

    }

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
    const [openResponses, setOpenResponses] = useState(false);
    const [loading, setLoading] = useState(true);
    const [testAction, setTestAction] = useState(false);
    const [massAction, setMassAction] = useState(false);
    const [inputValue, setInputValue] = useState({});
    const [phone, SetPhone] = useState(null);
    const [loadingMassSend, SetloadingMassSend] = useState(false);
    const [phoneList, SetPhoneList] = useState([]);

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

    useEffect(() => {

        fetchData();
    }, [fetchData]);



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
        }finally{
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

    }, [openLogs, openResponses, paginationModel, sortModel, applyFilterTrigger]);


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
                                    columns={columns()}
                                    rowCount={rowCount}
                                    rowHeight={100}
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
                                    columns={responseColumns()}
                                    rowCount={rowCount}
                                    rowHeight={100}
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

            {/* <Button variant="contained" color="primary" size="small" sx={{ textTransform: 'none', marginRight: 1 }} onClick={() => { setTestAction(true); }} disabled={content === null}>
                <FaWhatsapp size={17} style={{ marginRight: 10 }} /> Test Message
            </Button> */}
            <Button variant="contained" color="primary" size="small" sx={{ textTransform: 'none', marginRight: 1 }} onClick={() => { setMassAction(true); }} disabled={content === null}>
                <FaWhatsapp size={17} style={{ marginRight: 10 }} /> Send Message
            </Button>
            <Button variant="outlined" color="primary" size="small" sx={{ textTransform: 'none', marginRight: 1 }} onClick={() => setOpenLogs(true)}>
                Twilio Delivery Logs
            </Button>
            <Button variant="outlined" color="primary" size="small" sx={{ textTransform: 'none' }} onClick={() => setOpenResponses(true)}>
                Response Logs
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
                <div className="p-2 ">

                    <form onSubmit={handleSubmit} className="row">


                        <div className="col-4 m-0 p- 0">
                            <div className="form-control mb-2">

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

                        <div className={`col-6 m-0 p-0 ${massAction ? "" : "d-none"}`}>
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






                    <Button variant="contained" 
                    color="primary" sx={{ textTransform: 'none', width: '100%' }} type="submit" disabled={phoneList.length === 0}
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
                    </form>

                </div>

            </Modal>

        </Box>





    );
};



export default WhatsappBroadcast;