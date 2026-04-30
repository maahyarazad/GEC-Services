
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
import JSONPretty from 'react-json-pretty';
import 'react-json-pretty/themes/monikai.css'; // optional styling
import { useSnackbar } from '../../Providers/Snackbar';
import { AiOutlineClear } from "react-icons/ai";
import { RiContactsBook2Fill } from "react-icons/ri";
import { RiUserReceivedFill } from "react-icons/ri";
import { RiCheckDoubleFill } from "react-icons/ri";
import { BsCalendar2Event } from "react-icons/bs";
import CreateContact from "./CreateContact";
import { IoAddCircleOutline } from "react-icons/io5";
import { columns, responseColumns, tabstyle, normalizePhone } from './WhatsAppComponentConfig'
import MessageModal from "./MessageModal";
import { useAlertDialog } from "../../Providers/AlertProvider";
import QuickReply from "./QuickReply";
import { IoStatsChartSharp } from "react-icons/io5";
import WhastAppReport from '../Dashboard/WhastAppReport';
import WhastAppTypeReport from '../Dashboard/WhastAppTypeReport';
import WhastAppAttendanceTypeReport from '../Dashboard/WhastAppAttendanceTypeReport';
import { useNavigate, useLocation } from "react-router-dom";
import FilterParams from '../FilterParams';
import { MdInsights } from "react-icons/md";
import { PiUserCircleCheckDuotone } from "react-icons/pi";
import ContactBookDataGrid from './ContactBookDataGrid';
import ViewModeButtonGroup from "./ViewModeButtonGroup";
import EventSection from '../../Sections/EventSection';
import EventSpeedDial from "./EventSpeedDial";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { setEvents, getShouldRefetch, clearRefetch, getSelectedEvent, triggerRefetchGuestList } from "../../../features/eventSlice";
import { SiGooglemaps } from "react-icons/si";
import UpdateMapUrl from './UpdateMapUrl';
const WhatsappBroadcast = () => {

    const location = useLocation();
    const navigate = useNavigate();
    const { openDialog } = useAlertDialog();
    const [data, setData] = useState();
    const [groupedByTypeKey, setGroupedByTypeKey] = useState();

    const [openPanel, setOpenPanel] = useState(null);
    // null | 'contact-book' | 'event-list' | 'response-logs' | 'delivery-logs' | 'report' | 'report-type' | 'report-type-attendance'
    const [loading, setLoading] = useState(true);
    const [viewJsonModal, setViewJsonModal] = useState(false);
    const [JSON_Value_Response_Log, setJSON_Value_Response_Log] = useState(null);
    const [viewCreateNewContact, setViewCreateNewContact] = useState(false);

    const dispatch = useAppDispatch();
    const shouldRefetch = useAppSelector(getShouldRefetch);

    const fetchEvents = useCallback(async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/events/latest`,
                {
                    method: "GET",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                }
            );

            const responseData = await response.json();

            if (!response.ok) {
                console.error(responseData.error);
                return;
            }

            dispatch(setEvents(responseData.rows ?? []));

        } catch (error) {
            console.error(error);
        }
        finally {
            dispatch(clearRefetch());
        }
    }, [dispatch]);





    useEffect(() => {
        if (shouldRefetch) {

            fetchEvents();
        }
    }, [shouldRefetch, fetchEvents]);


    const [contactList, setContactList] = useState([]);
    const [viewMode, setViewMode] = useState("default"); // "default" | "corrupted" | "guest_list"
    const [debouncedViewMode, setDebouncedViewMode] = useState(viewMode);
    const [messageState, setMessageState] = useState({
        useContactBook: false,
        useTestBook: false,
        useLanguage: true,
        useAudience: 'club_member',
        phoneList: [],
        inputValue: {},
        content: null,
        testAction: false,
        massAction: false,
        loadingMassSend: false,
        loadingMassSend: false,
        phone: '',
        senderLimit: 500,
    });


    const handleMessageStateChange = (key, value) => {
        setMessageState(prev => ({
            ...prev,
            [key]: value,
        }));
    };


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

    useEffect(() => {
        fetchData();
        fetchEvents();
    }, []);

    const fetchContactData = useCallback(async () => {
        try {
            setloading_logs(true)

            const modeQueryMap = {
                blacklist: "?blacklist=1",
                corrupted: "?corrupted=1",
                guest_list: "?guest_list=1",
                default: "",
            };

            const query = modeQueryMap[viewMode];

            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/contacts${modeQueryMap[viewMode] ?? ""}`,
                { credentials: "include" }
            );


            if (response.status === 200) {
                const response_data = await response.json();

                setContactList(response_data.data);
            }
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setloading_logs(false)
        }
    }, [debouncedViewMode]);

    const fetchCorruptedContactData = useCallback(async () => {
        try {
            setloading_logs(true)

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/contacts/corrupted-contact-book`, { method: "GET", credentials: "include" });


            if (response.status === 200) {
                const response_data = await response.json();
                setContactList(response_data.data);
            }
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setloading_logs(false)
        }
    }, [])





    useEffect(() => {
        const timer = setTimeout(() => setDebouncedViewMode(viewMode), 60);
        return () => clearTimeout(timer);
    }, [viewMode]);


    useEffect(() => {
        if (openPanel === 'contact-book') fetchContactData();
    }, [openPanel, fetchContactData]);

    const onViewJson = (value, type, full_name) => {

        setViewJsonModal(true);
        setJSON_Value_Response_Log({ value, type, full_name });
    }

    const onViewHistory = (value, type) => {

        setViewJsonModal(true);
        setJSON_Value_Response_Log({ value, type });
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


    const callClearContactBook = async () => {
        try {
            setloading_logs(true);

            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/contacts/clear-contact-book`,
                {
                    method: 'GET',
                    credentials: 'include',
                }
            );

            const responseData = await response.json();

            if (!response.ok) {
                showSnackbar(responseData.message, 'error');
            } else {
                showSnackbar(responseData.message || 'Contact book cleared', 'success');

            }

        } catch (err) {
            console.error('Failed to clear contact book:', err);
            showSnackbar(err.message, 'error');
        } finally {
            setloading_logs(false);
        }
    };

    const eventId = useAppSelector(getSelectedEvent);

    const onGuestAttend = async (row) => {
        const { id } = row;

        if (!eventId?.id) return;

        try {

            const params = new URLSearchParams({
                contactId: String(id),
                eventId: String(eventId.id),
            });

            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/contacts/complete-attendance?${params}`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                }
            );

            const responseData = await response.json();

            if (!response.ok) {
                showSnackbar(responseData.message, 'error');
            } else {
                dispatch(triggerRefetchGuestList());
                showSnackbar(responseData.message || 'Attendance marked complete', 'success');
            }

        } catch (err) {
            console.error('Failed to update attendance:', err);
            showSnackbar(err.message, 'error');
        } finally {
            setloading_logs(false);
        }
    };


    const clearContactBook = () => {
        openDialog(
            <>
                <>
                    <strong>⚠️ Warning:</strong>
                    <br></br>
                    This operation is irreversible. Once cleared, all contact delivery flag information will be permanently deleted.
                    <br></br>
                    <strong>When to use:</strong>
                    <br></br>

                    Click this button <strong>after your ClubTime invitation process is complete </strong>and you no longer need the current message records.

                </>
            </>,
            'Clear Contact Book & Reset Flags',
            {
                text: 'Clear',
                color: 'error',
            },
            () => { callClearContactBook() },
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



    const handleSubmit = (e) => {
        e.preventDefault(); // move it here, outside the dialog callback

        openDialog(
            <>
                Have you reviewed all parameters and settings before sending your request?{' '}
                <strong>This action cannot be undone.</strong>
            </>,
            'Confirm Action',
            {
                text: 'Confirm',
                color: 'danger',
            },
            async () => {
                handleMessageStateChange('massAction', true);
                try {
                    const requiredKeys = messageState.content?.variables
                        ? Object.keys(messageState.content.variables)
                        : [];

                    for (const key of requiredKeys) {
                        if (!messageState.inputValue[key] || messageState.inputValue[key].trim() === '') {
                            alert(`Please fill Variable ${key}`);
                            return;
                        }
                    }

                    const response = await fetch(
                        `${import.meta.env.VITE_SERVERURL}/api/whatsapp/send`,
                        {
                            method: 'POST',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                useContactBook: messageState.useContactBook,
                                useTestBook: messageState.useTestBook,
                                useLanguage: messageState.useLanguage,
                                useAudience: messageState.useAudience,
                                phoneList: messageState.phoneList,
                                payload: messageState.inputValue,
                                template: messageState.content,
                                senderLimit: messageState.senderLimit,
                            }),
                        }
                    );

                    if (response.ok) {
                        const responseData = await response.json();
                        showSnackbar(responseData.message, 'success');
                        handleMessageStateChange('testAction', false);
                    } else {
                        const errorData = await response.json();
                        showSnackbar(errorData.message || 'Failed to send message', 'error');
                    }
                } catch (error) {
                    console.error('Failed to send:', error);
                    showSnackbar('Unexpected error occurred', 'error');
                } finally {
                    handleMessageStateChange('massAction', false);
                    handleMessageStateChange('phoneList', []);
                }
            },
            () => { } // cancel callback
        );
    };

    //////////////////////////////  RESPONSE LOGS   /////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////

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


    /////////////////////////////////  DELIVERY LOGS   /////////////////////////
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

    const now = new Date();
    const defaultStart = new Date();
    defaultStart.setDate(now.getDate() - 2);
    const formatDateForInput = (date) =>
        date.toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState(formatDateForInput(defaultStart));
    const [endDate, setEndDate] = useState(formatDateForInput(now));

    const fetchLogs = useCallback(

        async (paginationModel, sortModel = [], filterModel = {}, start, end) => {

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
                    filterParams
                ].filter(Boolean).join('&');

                const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/whatsapp/twilio-delivery-logs?${queryParams}&startDate=${start}&endDate=${end}`, { credentials: "include" });
                const data = await response.json();



                setLogs(data.result || []);
                setRowCount(data.pagination.totalCount || 0);
            } catch (err) {
                console.error('Failed to fetch:', err);
            } finally {
                setloading_logs(false);
            }
        },
        []
    );

    useEffect(() => {
        if (openPanel === 'delivery-logs') fetchLogs(paginationModel, sortModel, applyFilterTrigger, startDate, endDate);
        if (openPanel === 'response-logs') fetchResponses();


    }, [openPanel, paginationModel, sortModel, applyFilterTrigger, startDate, endDate]);


    ////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////
    const [showChart, setShowChart] = useState(false);
    useEffect(() => {
        if (openPanel === 'report' || openPanel === 'report-type' || openPanel === 'report-type-attendance') {
            const timer = setTimeout(() => setShowChart(true), 200);
            return () => clearTimeout(timer);
        } else {
            setShowChart(false);
        }
    }, [openPanel]);


    useEffect(() => {
        const modalView = new URLSearchParams(location.search).get("view");

        const panelMap = {
            "report": "report",
            "report-type": "report-type",
            "report-type-attendance": "report-type-attendance",
            "response-logs": "response-logs",
            "delivery-logs": "delivery-logs",
            "contact-book": "contact-book",
            "event-list": "event-list",
            "update-map-url": "update-map-url",
        };

        setOpenPanel(panelMap[modalView] ?? null);
    }, []);

    const handleSetOpenPanel = (panel) => {

        // ✅ Read existing params and only update "view"
        const params = new URLSearchParams(location.search);


        if (panel) {
            params.set("view", panel);
        } else {
            params.delete("view");
        }

        navigate({
            pathname: location.pathname,
            search: `?${params.toString()}`,
        }, { replace: true });

        setOpenPanel(panel);
    };

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


    const REPORT_MODALS = [
        {
            panel: 'report',
            title: 'Delivery Status',
            Component: WhastAppReport,
        },
        {
            panel: 'report-type',
            title: 'Delivery Status By Contact Type',
            Component: WhastAppTypeReport,
        },
        {
            panel: 'report-type-attendance',
            title: 'Attendance Status By Contact Type',
            Component: WhastAppAttendanceTypeReport,
        },
    ];


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



            {REPORT_MODALS.map(({ panel, title, Component }) => (
                <Modal
                    key={panel}
                    isOpen={openPanel === panel}
                    onRequestClose={() => handleSetOpenPanel(null)}
                    title={title}
                >
                    <div className="d-lg-flex justify-content-between align-items-center">
                        {showChart && <Component />}
                    </div>
                </Modal>
            ))}

                {/* Google Map URL Modal */}
                <Modal
                    isOpen={openPanel === 'update-map-url'}
                    onRequestClose={() => handleSetOpenPanel(null)}
                    title="Update Google Map URL"
                >
                    <UpdateMapUrl />
                </Modal>

            <SlideMenu id={`${openPanel === 'response-logs' ? "response-logs" : "delivery-logs"}`}
                isOpen={openPanel === 'response-logs' || openPanel === 'delivery-logs'}
                onClose={() => { handleSetOpenPanel(null) }}
                headerTitle={openPanel === 'delivery-logs' ? 'Delivery Logs' : 'Response Logs'}
            >


                {loading_logs ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {openPanel === 'delivery-logs' && (
                            <div style={{ width: '100%', height: 'calc(100vh - 155px)' }}>

                                <div style={{ marginBottom: 12 }} className="d-flex">
                                    <div >

                                        <label>
                                            Start Date{" "}
                                            <input className=""
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                            />
                                        </label>{" "}
                                    </div>
                                    <div className="ps-2">

                                        <label>
                                            End Date{" "}
                                            <input
                                                type="date"
                                                className=""
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                            />
                                        </label>
                                    </div>
                                </div>


                                <DataGrid
                                    rows={logs}
                                    columns={columns({ onViewJson })}
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

                        {openPanel === 'response-logs' && (
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
                isOpen={openPanel === 'contact-book'}
                onClose={() => { handleSetOpenPanel(null) }}
                headerTitle={'Contact Book'}
            >


                <div style={{ width: '100%', height: 'calc(100vh - 125px)' }} className={`${openPanel === 'contact-book' ? "" : "hidden"}`}>
                    <div className="col-12 d-flex flex-start align-items-center">
                        <div className="d-flex">
                            <Button className="me-2"
                                variant="contained" color="primary" size="small"
                                sx={{ textTransform: 'none', marginBottom: 1 }}
                                onClick={() => { setViewCreateNewContact(true); }}>
                                <IoAddCircleOutline size={17} style={{ marginRight: 2 }} /> Create New Contact
                            </Button>
                            <ViewModeButtonGroup viewMode={viewMode} setViewMode={setViewMode} />
                        </div>
                    </div>

                    {loading_logs ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (

                        <ContactBookDataGrid
                            contactList={contactList}
                            viewMode={viewMode}
                            paginationModel={_paginationModel}
                            setPaginationModel={_setPaginationModel}
                            onModifyContact={onModifyContact}
                            onDeleteContact={onDeleteContact}
                            onSwitchBlacklist={onSwitchBlacklist}
                            onGuestAttend={onGuestAttend}
                        />

                    )}
                </div>
            </SlideMenu>

            <SlideMenu id={'event-list'}
                isOpen={openPanel === 'event-list'}
                onClose={() => { handleSetOpenPanel(null) }}
                headerTitle={'Event List'}
            >

                <EventSection />

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

                <IconButton title='Open Delivery Report' onClick={() => handleSetOpenPanel('report')}>
                    <IoStatsChartSharp />
                </IconButton>

                <IconButton title='Open Delivery Insight by Contact Type' onClick={() => handleSetOpenPanel('report-type')}>
                    <MdInsights />
                </IconButton>

                <IconButton title='Open Attendance Insight by Contact Type' onClick={() => handleSetOpenPanel('report-type-attendance')}>
                    <PiUserCircleCheckDuotone />
                </IconButton>

                <IconButton title='Reset ClubTime invitation data from Contact Book' onClick={clearContactBook}>
                    <AiOutlineClear style={{ marginRight: 2 }} />
                </IconButton>

                <IconButton title='Reset ClubTime invitation data from Contact Book' onClick={()=> handleSetOpenPanel('update-map-url')}>
                    <SiGooglemaps style={{ marginRight: 2 }} />
                </IconButton>

                <Button variant="contained" color="primary" size="small" sx={{ textTransform: 'none', marginRight: 1 }} onClick={() => { handleMessageStateChange('massAction', true); }} disabled={messageState.content === null}>
                    <FaWhatsapp size={17} style={{ marginRight: 2 }} /> Send Message
                </Button>

                <Button variant="outlined" color="primary" size="small" sx={{ textTransform: 'none', marginRight: 1 }} onClick={() => handleSetOpenPanel('contact-book')}>
                    <RiContactsBook2Fill size={17} style={{ marginRight: 2 }} />
                    Contact Book
                </Button>
                <Button variant="outlined" color="primary" size="small" sx={{ textTransform: 'none', marginRight: 1 }} onClick={() => handleSetOpenPanel('event-list')}>
                    <BsCalendar2Event size={17} style={{ marginRight: 2 }} />
                    Event List
                </Button>
                <Button variant="outlined" color="primary" size="small" sx={{ textTransform: 'none', marginRight: 1 }} onClick={() => handleSetOpenPanel('response-logs')}>
                    <RiUserReceivedFill style={{ marginRight: 2 }} />
                    Response Logs
                </Button>
                <Button variant="outlined" color="primary" size="small" sx={{ textTransform: 'none', marginRight: 1 }} onClick={() => handleSetOpenPanel('delivery-logs')}>
                    <RiCheckDoubleFill style={{ marginRight: 2 }} />
                    Delivery Logs
                </Button>

            </div>
            <div style={{ height: 'calc(100vh - 155px)', overflow: 'scroll', position: 'relative' }} >
                <div className="mt-2">

                    <div className="row m-0">

                        <div className="col-lg-5 col-12" style={{ height: 'calc(100vh - 185px)', overflow: 'scroll' }}>
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
                                                        <div key={idx} onClick={() => {

                                                            handleMessageStateChange("inputValue", {});
                                                            handleMessageStateChange("content", item);
                                                        }}
                                                            style={{ border: 'solid', borderRadius: '5px', borderColor: 'gray', borderWidth: '1px', padding: '5px', marginBottom: '5px', cursor: 'pointer', overflow: 'clip' }}>

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
                        <div style={{ position: 'fixed', right: 10, maxWidth: '45vw', height: 'calc(100vh - 200px)', overflow: 'scroll' }}>

                            {messageState.content && messageState.content.types ? (
                                (() => {
                                    const typeKey = Object.keys(messageState.content.types)[0];
                                    const data = messageState.content.types[typeKey];

                                    switch (typeKey) {
                                        case "whatsapp/authentication": {
                                            const { body, actions, add_security_recommendation } = data;
                                            return (
                                                <Paper sx={{ p: 2 }} elevation={5} >
                                                    <Typography variant="h6">{messageState.content?.friendlyName}</Typography>
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
                                                    <Typography variant="h6">{messageState.content?.friendlyName}</Typography>
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
                                                    <Typography variant="h6">{messageState.content?.friendlyName}</Typography>
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
                                                    <Typography variant="h5">{messageState.content?.friendlyName}</Typography>
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
                                                    <Typography variant="h6">{messageState.content?.friendlyName}</Typography>
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
                                                    <Typography variant="h6">{messageState.content?.friendlyName}</Typography>
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
                state={messageState}
                handleMessageStateChange={handleMessageStateChange}
                handleSubmit={handleSubmit}
                normalizePhone={normalizePhone}
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