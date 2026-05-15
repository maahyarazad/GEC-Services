
import { useEffect, useRef, useState, useCallback } from "react";
import { FaWhatsapp } from "react-icons/fa";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { Divider } from "@mui/material";
import { Button } from '@mui/material'
import Modal from '../../Modal';
import SlideMenu from '../../SlideMenu/SlideMenu';
import { DataGrid } from '@mui/x-data-grid';
import CustomDataGrid from '../../CustomDataGrid';
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
import { columns, responseColumns, normalizePhone } from './WhatsAppComponentConfig'
import MessageModal from "./MessageModal";
import { useAlertDialog } from "../../Providers/AlertProvider";
import QuickReply from "./QuickReply";
import { IoStatsChartSharp } from "react-icons/io5";
import WhastAppReport from '../Dashboard/WhastAppReport';
import WhastAppTypeReport from '../Dashboard/WhastAppTypeReport';
import WhastAppAttendanceTypeReport from '../Dashboard/WhastAppAttendanceTypeReport';
import ContactBookMissingContentSidReport from '../Dashboard/ContactBookMissingContentSidReport';
import { useNavigate, useLocation } from "react-router-dom";
import FilterParams from '../FilterParams';
import { MdInsights, MdPersonSearch } from "react-icons/md";
import { PiUserCircleCheckDuotone } from "react-icons/pi";
import ContactBookDataGrid from './ContactBookDataGrid';
import ViewModeButtonGroup from "./ViewModeButtonGroup";
import EventSection from '../../Sections/EventSection';
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { setEvents, getShouldRefetch, clearRefetch, getSelectedEvent, triggerRefetchGuestList } from "../../../features/eventSlice";
import { SiGooglemaps } from "react-icons/si";
import UpdateMapUrl from './UpdateMapUrl';
import TwilioCreditWarning from './TwilioCreditWarning';
import { blueGrey } from '@mui/material/colors';
import TwilioTemplateDataGrid from "./TwilioTemplateDataGrid";
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
    const [contactRowCount, setContactRowCount] = useState(0);
    const [contactPaginationModel, setContactPaginationModel] = useState({ page: 0, pageSize: 25 });
    const [contactSortModel, setContactSortModel] = useState([{ field: 'id', sort: 'asc' }]);
    const [contactFilterItems, setContactFilterItems] = useState([]);
    const [debouncedContactFilterItems, setDebouncedContactFilterItems] = useState([]);
    const [viewMode, setViewMode] = useState("default"); // "default" | "corrupted" | "guest_list"
    const [debouncedViewMode, setDebouncedViewMode] = useState(viewMode);
    const [messageState, setMessageState] = useState({
        useContactBook: false,
        useGuestList: false,
        useLanguage: true,
        useAudience: 'club_member',
        phoneList: [],
        inputValue: {},
        content: null,
        testAction: false,
        massAction: false,
        loadingMassSend: false,
        phone: '',
        senderLimit: 500,
        eventId: 0
    });


    const handleMessageStateChange = (key, value) => {
        setMessageState(prev => ({
            ...prev,
            [key]: value,
        }));
    };


    const { showSnackbar } = useSnackbar();
    const [twilioCreditLow, setTwilioCreditLow] = useState(false);
    const [twilioCreditLowMessage, setTwilioCreditLowMessage] = useState(null);
    const fetchData = useCallback(async () => {
        try {

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/whatsapp/list`, { credentials: "include" });

            if (response.status === 401) {
                const response_data = await response.json();
                setTwilioCreditLowMessage(response_data);
                setTwilioCreditLow(true)

            }
            if (response.status === 200) {
                const response_data = await response.json();

                setData(response_data.templates);

                setTwilioCreditLowMessage(null);
                setTwilioCreditLow(false)
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

    const buildContactFilterParams = (filterItems = []) => {
        const active = filterItems.filter(
            (f) => f.value !== '' || ['isEmpty', 'isNotEmpty'].includes(f.operator)
        );
        if (active.length === 0) return '';
        return active.map((f) =>
            `filterField[]=${encodeURIComponent(f.field)}` +
            `&filterOperator[]=${encodeURIComponent(f.operator)}` +
            `&filterValue[]=${encodeURIComponent(f.value ?? '')}`
        ).join('&');
    };

    const fetchContactData = useCallback(async (pagination, sort, filters) => {
        try {
            setloading_logs(true);

            // Corrupted contacts: simple full-fetch, no server-side params
            if (debouncedViewMode === 'corrupted') {
                const response = await fetch(
                    `${import.meta.env.VITE_SERVERURL}/api/contacts?corrupted=1`,
                    { credentials: 'include' }
                );
                if (response.status === 200) {
                    const response_data = await response.json();
                    setContactList(response_data.data);
                }
                return;
            }

            // Build mode flag
            const modeFlag = debouncedViewMode === 'blacklist' ? 'blacklist=1'
                : debouncedViewMode === 'guest_list' ? 'guest_list=1'
                : '';

            // Server-side params for default / blacklist only
            const { field: sortField = '', sort: sortOrder = '' } = (sort ?? [])[0] ?? {};
            const filterParams = buildContactFilterParams(filters ?? []);

            const queryParams = [
                modeFlag,
                `page=${(pagination?.page ?? 0) + 1}`,
                `pageSize=${pagination?.pageSize ?? 25}`,
                sortField  ? `sortField=${sortField}`   : '',
                sortOrder  ? `sortOrder=${sortOrder}`   : '',
                filterParams,
            ].filter(Boolean).join('&');

            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/contacts?${queryParams}`,
                { credentials: 'include' }
            );

            if (response.status === 200) {
                const response_data = await response.json();
                setContactList(response_data.data);
                if (response_data.total !== undefined) setContactRowCount(response_data.total);
            }
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setloading_logs(false);
        }
    }, [debouncedViewMode]);






    useEffect(() => {
        const timer = setTimeout(() => setDebouncedViewMode(viewMode), 60);
        return () => clearTimeout(timer);
    }, [viewMode]);


    // Tracks the last effective filter state that was actually sent to the server
    const contactFilterSentRef = useRef([]);

    // Returns a stable string fingerprint of the filters that matter server-side
    // (only filters with a non-empty value, or no-value operators like isEmpty/isNotEmpty)
    const getEffectiveFilterKey = (items) =>
        items
            .filter((f) => f.value !== '' || ['isEmpty', 'isNotEmpty'].includes(f.operator))
            .map(({ field, operator, value }) => `${field}:${operator}:${value ?? ''}`)
            .sort()
            .join('|');

    // Reset pagination + filters when the view mode changes
    useEffect(() => {
        setContactPaginationModel({ page: 0, pageSize: 25 });
        setContactFilterItems([]);
        setDebouncedContactFilterItems([]);
        contactFilterSentRef.current = [];
    }, [viewMode]);

    // Debounce filter changes — only sends to server when the effective
    // filter values change, not when the user is just picking a column or operator
    useEffect(() => {
        const timer = setTimeout(() => {
            const currentKey = getEffectiveFilterKey(contactFilterItems);
            const sentKey    = getEffectiveFilterKey(contactFilterSentRef.current);
            if (currentKey === sentKey) return; // field/operator change with no value — skip
            contactFilterSentRef.current = contactFilterItems;
            setDebouncedContactFilterItems(contactFilterItems);
            setContactPaginationModel((prev) => ({ ...prev, page: 0 }));
        }, 400);
        return () => clearTimeout(timer);
    }, [contactFilterItems]);

    useEffect(() => {
        if (openPanel === 'contact-book') {
            fetchContactData(contactPaginationModel, contactSortModel, debouncedContactFilterItems);
        }
    }, [openPanel, fetchContactData, contactPaginationModel, contactSortModel, debouncedContactFilterItems]);

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

            await fetchContactData(contactPaginationModel, contactSortModel, debouncedContactFilterItems);


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




    const onRemoveGuestRequest = (id) => {
        openDialog(
            <>
                <strong>⚠️ Warning:</strong>
                <br />
                This action will permanently remove this guest from the guest list.
                <br /><br />

                <strong>This action cannot be undone.</strong>
                <br /><br />

                <strong>When to use:</strong>
                <br />
                Use this option if you want to remove a guest who should no longer be part of the event.
            </>,
            'Remove Guest',
            {
                text: 'Remove',
                color: 'error',
            },
            () => { onRemoveGuest(id) },
            () => { }
        );
    };




    const onRemoveGuest = async (row) => {
        const { id } = row;

        if (!eventId?.id) return;

        try {

            const params = new URLSearchParams({
                contactId: String(id),
                eventId: String(eventId.id),
            });

            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/contacts/remove-guest?${params}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                }
            );

            const responseData = await response.json();

            if (!response.ok) {
                showSnackbar(responseData.message || 'Failed to remove guest', 'error');
            } else {
                dispatch(triggerRefetchGuestList());
                showSnackbar(responseData.message || 'Guest removed successfully', 'success');
            }

        } catch (err) {
            console.error('Failed to remove guest:', err);
            showSnackbar(err.message || 'Unexpected error occurred', 'error');
        } finally {

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
                await fetchContactData(contactPaginationModel, contactSortModel, debouncedContactFilterItems);
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
                                'Content-Type': 'application/json; charset=UTF-8',
                            },
                            body: JSON.stringify({
                                useContactBook: messageState.useContactBook,
                                useGuestList: messageState.useGuestList,
                                useLanguage: messageState.useLanguage,
                                useAudience: messageState.useAudience,
                                phoneList: messageState.phoneList,
                                payload: messageState.inputValue,
                                template: messageState.content,
                                senderLimit: messageState.senderLimit,
                                eventId: messageState.eventId,
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

    const buildResponsesFilterParams = (filterItems = []) => {
        const active = filterItems.filter(
            (f) => f.value !== '' || ['isEmpty', 'isNotEmpty'].includes(f.operator)
        );
        if (active.length === 0) return '';
        return active.map((f) =>
            `filterField[]=${encodeURIComponent(f.field)}` +
            `&filterOperator[]=${encodeURIComponent(f.operator)}` +
            `&filterValue[]=${encodeURIComponent(f.value ?? '')}`
        ).join('&');
    };

    const fetchResponses = useCallback(
        async (pagination, sort, filters) => {
            setloading_logs(true);
            try {
                const { field: sortField = '', sort: sortOrder = '' } = (sort ?? [])[0] ?? {};
                const filterParams = buildResponsesFilterParams(filters ?? []);

                const queryParams = [
                    `page=${(pagination?.page ?? 0) + 1}`,
                    `pageSize=${pagination?.pageSize ?? 25}`,
                    sortField  ? `sortField=${sortField}`   : '',
                    sortOrder  ? `sortOrder=${sortOrder}`   : '',
                    filterParams,
                ].filter(Boolean).join('&');

                const response = await fetch(
                    `${import.meta.env.VITE_SERVERURL}/api/whatsapp/twilio-response-logs?${queryParams}`,
                    { credentials: 'include' }
                );
                const data = await response.json();
                setResponses(data.data || []);
                setResponsesRowCount(data.total || 0);
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
    const [logs, setLogs] = useState([]);
    const [responses, setResponses] = useState([]);
    const [responsesRowCount, setResponsesRowCount] = useState(0);
    const [responsesPaginationModel, setResponsesPaginationModel] = useState({ page: 0, pageSize: 25 });
    const [responsesSortModel, setResponsesSortModel] = useState([{ field: 'id', sort: 'desc' }]);
    const [responsesFilterItems, setResponsesFilterItems] = useState([]);
    const [debouncedResponsesFilterItems, setDebouncedResponsesFilterItems] = useState([]);

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
        if (openPanel === 'response-logs') fetchResponses(responsesPaginationModel, responsesSortModel, debouncedResponsesFilterItems);

    }, [openPanel, paginationModel, sortModel, applyFilterTrigger, startDate, endDate, responsesPaginationModel, responsesSortModel, debouncedResponsesFilterItems]);


    // Smart debounce for response-logs filters — same pattern as contact-book
    const responsesFilterSentRef = useRef([]);

    const getResponsesEffectiveFilterKey = (items) =>
        items
            .filter((f) => f.value !== '' || ['isEmpty', 'isNotEmpty'].includes(f.operator))
            .map(({ field, operator, value }) => `${field}:${operator}:${value ?? ''}`)
            .sort()
            .join('|');

    useEffect(() => {
        const timer = setTimeout(() => {
            const currentKey = getResponsesEffectiveFilterKey(responsesFilterItems);
            const sentKey    = getResponsesEffectiveFilterKey(responsesFilterSentRef.current);
            if (currentKey === sentKey) return;
            responsesFilterSentRef.current = responsesFilterItems;
            setDebouncedResponsesFilterItems(responsesFilterItems);
            setResponsesPaginationModel((prev) => ({ ...prev, page: 0 }));
        }, 400);
        return () => clearTimeout(timer);
    }, [responsesFilterItems]);

    ////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////
    const [showChart, setShowChart] = useState(false);
    useEffect(() => {
        if (openPanel === 'report' || openPanel === 'report-type' || openPanel === 'report-type-attendance' || openPanel === 'report-missing-sid') {
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
            "report-missing-sid": "report-missing-sid",
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
                return "Payload";

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
        {
            panel: 'report-missing-sid',
            title: 'Remaining Invitations for the Current Event',
            Component: ContactBookMissingContentSidReport,
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
                                <CustomDataGrid
                                    rows={responses}
                                    columns={responseColumns({ onViewJson, onViewHistory })}
                                    loading={loading_logs}
                                    showToolbar

                                    filterMode='server'
                                    sortingMode='server'
                                    paginationMode='server'

                                    rowCount={responsesRowCount}
                                    paginationModel={responsesPaginationModel}
                                    onPaginationModelChange={setResponsesPaginationModel}
                                    rowsPerPageOptions={[25, 50, 100]}

                                    sortModel={responsesSortModel}
                                    onSortModelChange={setResponsesSortModel}

                                    filterItems={responsesFilterItems}
                                    onFilterItemsChange={setResponsesFilterItems}

                                    disableRowSelectionOnClick
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
                        <Box sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },  // 👈 stack on mobile
                            alignItems: { xs: 'flex-start', md: 'center' },
                            gap: 1,
                            mb: 1,
                        }}>
                            <Button
                                variant="contained"
                                color="success"
                                size="small"
                                sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                                onClick={() => { setViewCreateNewContact(true); }}
                            >
                                <IoAddCircleOutline size={17} style={{ marginRight: 2 }} /> Create New Contact
                            </Button>
                            <ViewModeButtonGroup viewMode={viewMode} setViewMode={setViewMode} />
                        </Box>
                    </div>

                    <ContactBookDataGrid
                        contactList={contactList}
                        viewMode={viewMode}
                        paginationModel={contactPaginationModel}
                        setPaginationModel={setContactPaginationModel}
                        onModifyContact={onModifyContact}
                        onDeleteContact={onDeleteContact}
                        onSwitchBlacklist={onSwitchBlacklist}
                        onGuestAttend={onGuestAttend}
                        onRemoveGuest={onRemoveGuestRequest}
                        rowCount={contactRowCount}
                        sortModel={contactSortModel}
                        onSortModelChange={setContactSortModel}
                        filterItems={contactFilterItems}
                        onFilterItemsChange={setContactFilterItems}
                        loading={loading_logs}
                    />
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



            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>

                {/* ── Vertical action sidebar ── */}
                <Box
                    id="action-tab"
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        gap: 0.5,
                        minWidth: 44,
                        flexShrink: 0,
                    }}
                >
                    {/* TOP — primary action */}
                    <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
                        onClick={() => { handleMessageStateChange('massAction', true); }}
                        disabled={messageState.content === null}
                    >
                        <FaWhatsapp size={17} style={{ marginRight: 4 }} /> Send Message
                    </Button>

                    <Divider sx={{ my: 1 }} component="div"/>

                    {/* MIDDLE — navigation & utility buttons */}
                    <Button variant="outlined" color="primary" size="small" sx={{ textTransform: 'none', justifyContent: 'flex-start' }} onClick={() => handleSetOpenPanel('contact-book')}>
                        <RiContactsBook2Fill size={17} style={{ marginRight: 4 }} /> Contact Book
                    </Button>
                    <Button variant="outlined" color="primary" size="small" sx={{ textTransform: 'none', justifyContent: 'flex-start' }} onClick={() => handleSetOpenPanel('event-list')}>
                        <BsCalendar2Event size={17} style={{ marginRight: 4 }} /> Event List
                    </Button>
                    <Divider sx={{ my: 1 }} component="div"/>
                    <Button variant="outlined" color="primary" size="small" sx={{ textTransform: 'none', justifyContent: 'flex-start' }} onClick={() => handleSetOpenPanel('response-logs')}>
                        <RiUserReceivedFill style={{ marginRight: 4 }} /> Response Logs
                    </Button>
                    <Button variant="outlined" color="primary" size="small" sx={{ textTransform: 'none', justifyContent: 'flex-start' }} onClick={() => handleSetOpenPanel('delivery-logs')}>
                        <RiCheckDoubleFill style={{ marginRight: 4 }} /> Delivery Logs
                    </Button>

                    <Divider sx={{ my: 1 }} component="div"/>
                     <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        sx={{ textTransform: 'none', justifyContent: 'flex-start' }} title='Clear Delivery Flag from Contact Book' onClick={clearContactBook}>
                        <AiOutlineClear /> Clear Delivery Flag
                    </Button>
                    <Divider sx={{ my: 1 }} component="div"/>
                    <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        sx={{ textTransform: 'none', justifyContent: 'flex-start' }} title='Update Google Map URL' onClick={() => handleSetOpenPanel('update-map-url')}>
                        <SiGooglemaps size={17} style={{ marginRight: 4 }} /> Update Google Map
                    </Button>

                    {/* SPACER — pushes report icons to bottom */}
                    

                    <Divider sx={{ my: 1 }} component="div"/>

                    {/* BOTTOM — report icon buttons */}
                    <Button
                        variant="outlined"
                        size="small"
                    
                        sx={{ textTransform: 'none', justifyContent: 'flex-start', color: blueGrey[400], '&:hover': { color: blueGrey[400] }, borderColor: blueGrey[400] }} title='Open Delivery Report' onClick={() => handleSetOpenPanel('report')}>
                        <IoStatsChartSharp size={17} style={{ marginRight: 4 }} /> Delivery Report
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        sx={{ textTransform: 'none', justifyContent: 'flex-start', color: blueGrey[400], '&:hover': { color: blueGrey[400] }, borderColor: blueGrey[400] }} title='Open Delivery Insight by Contact Type' onClick={() => handleSetOpenPanel('report-type')}>
                        <MdInsights size={17} style={{ marginRight: 4 }} /> Delivery by Contact Type
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        sx={{ textTransform: 'none', justifyContent: 'flex-start', color: blueGrey[400], '&:hover': { color: blueGrey[400] }, borderColor: blueGrey[400] }} title='Open Attendance Insight by Contact Type' onClick={() => handleSetOpenPanel('report-type-attendance')}>
                        <PiUserCircleCheckDuotone size={17} style={{ marginRight: 4 }} /> Attendance by Contact Type
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        sx={{ textTransform: 'none', justifyContent: 'flex-start', color: blueGrey[400], '&:hover': { color: blueGrey[400] }, borderColor: blueGrey[400] }} title='Remaining Invitations for the Current Event' onClick={() => handleSetOpenPanel('report-missing-sid')}>
                        <MdPersonSearch size={17} style={{ marginRight: 4 }} /> Remaining Invitations
                    </Button>
                </Box>

                {/* ── Vertical divider ── */}
                <Divider orientation="vertical" flexItem sx={{ borderColor: 'grey.300' }} />

                {/* ── Main content area ── */}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    {groupedByTypeKey && <TwilioTemplateDataGrid groupedByTypeKey={groupedByTypeKey} messageState={messageState} handleMessageStateChange={handleMessageStateChange} />}
                    {twilioCreditLow && <TwilioCreditWarning twilioCreditLow={twilioCreditLow} twilioCreditLowMessage={twilioCreditLowMessage} />}
                </Box>

            </Box>




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
                    CloseModal={async () => {
                        setViewCreateNewContact(false);
                        setContactModifyVal(null);
                        await fetchContactData(contactPaginationModel, contactSortModel, debouncedContactFilterItems);
                    }}
                />
            </Modal>



        </Box>



    );
};



export default WhatsappBroadcast;