
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
import CreateContact from "./CreateContact";
import { IoAddCircleOutline } from "react-icons/io5";
import { columns, responseColumns, contactBookColumn, tabstyle, normalizePhone } from './WhatsAppComponentConfig'
import MessageModal from "./MessageModal";
import { useAlertDialog } from "../../Providers/AlertProvider";
import QuickReply from "./QuickReply";
import { IoStatsChartSharp } from "react-icons/io5";
import WhastAppReport from '../Dashboard/WhastAppReport';
import {  useNavigate, useLocation } from "react-router-dom";

const WhatsappBroadcast = () => {
    
    const location = useLocation();
    const navigate = useNavigate();
    const { openDialog } = useAlertDialog();
    const [data, setData] = useState();
    const [groupedByTypeKey, setGroupedByTypeKey] = useState();
    const [content, setContent] = useState(null);
    const [openLogs, setOpenLogs] = useState(false);
    const [openContactBook, setOpenContactBook] = useState(false);
    const [openResponses, setOpenResponses] = useState(false);
    const [loading, setLoading] = useState(true);
    const [viewJsonModal, setViewJsonModal] = useState(false);
    const [JSON_Value_Response_Log, setJSON_Value_Response_Log] = useState(null);
    const [viewStatus, setViewStatus] = useState(false);
    const [viewCreateNewContact, setViewCreateNewContact] = useState(false);
    const [testAction, setTestAction] = useState(false);
    const [massAction, setMassAction] = useState(false);
    const [inputValue, setInputValue] = useState({});
    const [phone, SetPhone] = useState('');
    const [loadingMassSend, SetloadingMassSend] = useState(false);
    const [phoneList, SetPhoneList] = useState([]);
    const [contactList, setContactList] = useState([]);
    const [useContactBook, setUseContactBook] = useState(false);
    const [useLanguage, setUseLanguage] = useState(true);
    const [useTestBook, setUseTestBook] = useState(false);
    const [viewBlackList, setViewBlackList] = useState(false);

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
    }, []);


    const fetchContactData = useCallback(async () => {
        try {
            setloading_logs(true)

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/contacts${viewBlackList ? '?blacklist=1' : ''}`, { credentials: "include" });

            if (response.status === 200) {
                const response_data = await response.json();

                setContactList(response_data.data);
            }
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setloading_logs(false)
        }
    }, [viewBlackList]);



    useEffect(() => {
        fetchData();
    }, [fetchData]);



    const onViewJson = (value, type,full_name) => {

        setViewJsonModal(true);
        setJSON_Value_Response_Log({value, type, full_name});
    }

    const onViewHistory = (value, type) => {
        
        setViewJsonModal(true);
        setJSON_Value_Response_Log({value, type});
    }

    const [contactModifyVal, setContactModifyVal] = useState(null);

    const onModifyContact = (val) => {
        setContactModifyVal(val);
        setViewCreateNewContact(true);
    }

    const deleteContact = async (contactId) => {
        try {
            setloading_logs(true);

            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/contacts`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ id: contactId }),
                }
            );

            const responseData = await response.json();

            if (!response.ok) {
                showSnackbar(responseData.message, "error");
            }

            await fetchContactData();


        } catch (err) {
            console.error('Failed to delete contact:', err);
            showSnackbar(err.message, "error");
        } finally {
            setloading_logs(false);
        }
    };


    const onDeleteContact = (row) => {
        openDialog(
            <>
                <>
                    Are you sure you want to <strong>delete this contact</strong>?
                    This action <strong>cannot be undone</strong>.
                </>
            </>,
            'Delete Contact',
            {
                text: 'Delete',
                color: 'error',
            },
            () => { deleteContact(row.id); },
            () => { }
        );
    };


const onSwitchBlacklist = (row, val) => {
    const updatedRow = {
        ...row,
        blacklist: val ? 1 : 0
    };

    handleSwitchBlacklist(updatedRow);
};

    const handleSwitchBlacklist = async (row) => {
        try {

            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/contacts/modify`,
                {
                    method: "PUT",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...row }),
                }
            );

            const responseData = await response.json();


            if (!response.ok) {
                console.error(responseData.error);
                showSnackbar(responseData.message, "error");
              

            } else {
                showSnackbar(responseData.message, "success");
                  await fetchContactData();
            }
        } catch (error) {
            console.error(error);
            showSnackbar(error.message || "Unexpected error occurred", "error");
        } finally {
            setLoading(false);
        }
    };

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
                        useTestBook: useTestBook,
                        useLanguage: useLanguage,
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
    const [_paginationModel, _setPaginationModel] = useState({
        page: 0,
        pageSize: 100,
    });

    const [logs, setLogs] = useState([]);
    const [responses, setResponses] = useState([]);

    const fetchResponses = useCallback(
        async () => {
            setloading_logs(true);
            try {
                
                const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/whatsapp/twilio-response-logs?`, { credentials: "include" });

                const data = await response.json();

                
                setResponses(data.data || []);
                setRowCount(data.length || 0);
            } catch (err) {
                console.error('Failed to fetch:', err);
            } finally {
                setloading_logs(false);
            }
        },
        []
    );

    const fetchLogs = useCallback(

        async () => {

            setloading_logs(true);
            try {
               

                const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/whatsapp/twilio-delivery-logs`, { credentials: "include" });
                const data = await response.json();
                
                setLogs(data.result || []);
                setRowCount(data.result.length || 0);
            } catch (err) {
                console.error('Failed to fetch:', err);
            } finally {
                setloading_logs(false);
            }
        },
        []
    );

    useEffect(() => {
        if (openLogs) fetchLogs();
        if (openResponses) fetchResponses();


    }, [openLogs, openResponses]);

    useEffect(() => {
        if (openContactBook) fetchContactData();
    }, [openContactBook, viewBlackList]);




    ////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////
const [showChart, setShowChart] = useState(false);
    useEffect(() => {
  if(viewStatus) {
    const timer = setTimeout(() => setShowChart(true), 200);
    return () => clearTimeout(timer);
  } else {
    setShowChart(false);
  }
}, [viewStatus]);


useEffect(() => {
    const params = new URLSearchParams(location.search);
    const modalView = params.get("view");
    if (modalView === "report") {
    setViewStatus(true);
    setOpenResponses(false);
  }

  if (modalView === "response_logs") {
    setOpenResponses(true);
    setViewStatus(false);
  }
  }, [location.search]);

  // When viewStatus changes, update the URL query params accordingly
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
if (viewStatus) {
    params.set("view", "report");
    setOpenResponses(false);
  } else if (openResponses) {
    params.set("view", "response_logs");
  } else {
    params.delete("view");
  }

    // Update URL without reloading page
    navigate({
      pathname: location.pathname,
      search: params.toString() ? `?${params.toString()}` : "",
    }, { replace: true }); // replace to avoid history stack pollution

  }, [viewStatus, navigate, location.pathname, location.search, openResponses]);


const modalTitle = (() => {
    switch (JSON_Value_Response_Log?.type) {
        case "log":
            return "Content SID";

        case "history":
            return "History";

        case "instant_reply":
            return "Instant Reply";

        default:
            return "";
    }
})();


const renderModalContent = () => {
    switch (JSON_Value_Response_Log?.type) {
        case "log":
            return <JSONPretty data={JSON_Value_Response_Log?.value} />;

        case "history":
            return <JSONPretty data={JSON_Value_Response_Log?.value} />;

        case "instant_reply":
            return (
                <QuickReply
                    contact_name={JSON_Value_Response_Log?.full_name}
                    incoming_message={JSON_Value_Response_Log?.value}
                    CloseModal={() => {
                        setViewJsonModal(false);
                        setJSON_Value_Response_Log(null);
                    }}
                />
            );

        default:
            return null;
    }
};


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

            <Modal isOpen={viewStatus}
                onRequestClose={() => { setViewStatus(false); }}
                title={`Delivery Status`}>

                <div className="d-lg-flex justify-content-between align-items-center">

                        {showChart && <WhastAppReport />}
                    </div>
            </Modal>


            <SlideMenu
                isOpen={openLogs || openResponses}
                onClose={() => {
                    setOpenLogs(false);
                    setOpenResponses(false);

                }}
                headerTitle={openLogs ? 'Delivery Logs' : 'Response Logs'}
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
                                    paginationModel={_paginationModel}
                                    onPaginationModelChange={_setPaginationModel}
                                    pageSizeOptions={[25, 50, 100]}
                                    pagination
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
                                    columns={responseColumns({ onViewJson, onViewHistory })}
                                     paginationModel={_paginationModel}
                                         onPaginationModelChange={_setPaginationModel}
                                    rowsPerPageOptions={[25, 50, 100]}
                                    pagination
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
                            <div style={{ width: '100%', height: 'calc(100vh - 125px)' }} >
                                <div className="col-12 d-flex flex-start align-items-center">

                                    <div className="">

                                        <Button className="me-2"
                                            variant="contained" color="primary" size="small" sx={{ textTransform: 'none', marginBottom: 1 }} onClick={() => { setViewCreateNewContact(true); }}>
                                            <IoAddCircleOutline size={17} style={{ marginRight: 2 }} /> Create New Contact
                                        </Button>
                                    </div>

                                    <div>
                                        <div className="">

                                            <label htmlFor="test-input">View Blacklist</label>

                                            <Switch
                                                size="small"
                                                title="Use Contact Book"
                                                checked={viewBlackList}
                                                onChange={(e) => setViewBlackList(e.target.checked)}
                                                color="primary"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <DataGrid
                                    rows={contactList}
                                    columns={contactBookColumn({ onModifyContact, onDeleteContact, onSwitchBlacklist })}
                                    paginationModel={_paginationModel}
                                    onPaginationModelChange={_setPaginationModel}
                                    pageSizeOptions={[25, 50, 100]}
                                    pagination
                                    disableRowSelectionOnClick
                                    disableSelectionOnClick
                                    showToolbar
                                />
                            </div>
                        )}
                    </>
                )}



            </SlideMenu>


           <Modal
    isOpen={viewJsonModal}
    onRequestClose={() => {
        setViewJsonModal(false);
        setJSON_Value_Response_Log(null);
    }}
    title={modalTitle}
>
    {renderModalContent()}
</Modal>



            <div className="pb-2 border-bottom border-1">

                <IconButton title='View MemberShip Status' onClick={()=> setViewStatus(true)}>
                    <IoStatsChartSharp/>
                </IconButton>

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
            </div>
            <div style={{ height: 'calc(100vh - 155px)', overflow: 'scroll' , position:'relative'}} >
                <div className="mt-2">

                    <div className="row m-0">

                        <div className="col-lg-5 col-12" style={{height:'calc(100vh - 185px)', overflow: 'scroll'}}>
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
                                                        <div key={idx} onClick={() => { setInputValue({}); setContent(item); }}
                                                            style={{ border: 'solid', borderRadius: '5px', borderColor: 'gray', borderWidth: '1px', padding: '5px', marginBottom: '5px', cursor: 'pointer', overflow:'clip' }}>

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
                        <div  style={{position: 'fixed' , right: 10, maxWidth: '45vw', height:'calc(100vh - 200px)', overflow: 'scroll'}}>

                            {content && content.types ? (
                                (() => {
                                    const typeKey = Object.keys(content.types)[0];
                                    const data = content.types[typeKey];

                                    switch (typeKey) {
                                        case "whatsapp/authentication": {
                                            const { body, actions, add_security_recommendation } = data;
                                            return (
                                                <Paper sx={{ p: 2 }} elevation={5} >
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


            <MessageModal
                massAction={massAction}
                setMassAction={setMassAction}
                setTestAction={setTestAction}
                content={content}
                useContactBook={useContactBook}
                useTestBook={useTestBook}
                useLanguage={useLanguage}
                setUseContactBook={setUseContactBook}
                setUseLanguage={setUseLanguage}
                setUseTestBook={setUseTestBook}
                handleSubmit={handleSubmit}
                inputValue={inputValue}
                setInputValue={setInputValue}
                phone={phone}
                SetPhone={SetPhone}
                phoneList={phoneList}
                SetPhoneList={SetPhoneList}
                normalizePhone={normalizePhone}
                loadingMassSend={loadingMassSend}
            />



            <Modal isOpen={viewCreateNewContact}
                onRequestClose={() => { setViewCreateNewContact(false); setContactModifyVal(null); }}

                title={`${contactModifyVal ? `Modify ${contactModifyVal.first_name} ${contactModifyVal.last_name}` : "Create a New Contact"}`}>
                <CreateContact
                    initialValues={contactModifyVal}
                    CloseModal={async () => { setViewCreateNewContact(false); setContactModifyVal(null); await fetchContactData(); }}
                />
            </Modal>


        </Box>



    );
};



export default WhatsappBroadcast;