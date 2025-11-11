import { useEffect, useState, useRef, useCallback } from "react";
import Modal from "../../Modal";
import RegistrationRequestForm from "../RegistrationRequestForm";
import { DataGrid } from '@mui/x-data-grid';
import { Switch, Button, Box, Tooltip, FormControlLabel, IconButton } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useSnackbar } from "../../Providers/Snackbar";
import { useAlertDialog } from '../../Providers/AlertProvider';
import lockRegistrationImage from '../../../assets/media/lock_registration.webp';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import RegistrationKeyList from '../Registration/RegistrationKeyList'
import { FaCheckCircle } from "react-icons/fa";
import { MdDisabledVisible } from "react-icons/md";
import { FaAddressCard } from "react-icons/fa";
import GECBackground from "../../../assets/media/GECBackground.webp";
import StarsField from "../../../assets/media/stars-field.webm";
import Slots from "../../utils/Slots";
import { MdAddCircleOutline } from "react-icons/md";
import { GrSchedules } from "react-icons/gr";
import { config } from '../../../ui_config';
import { IoDuplicate } from "react-icons/io5";
import { FaRegEdit } from "react-icons/fa";
import { IoMdArchive } from "react-icons/io";
import { SiGooglesheets } from "react-icons/si";
import { useWebSocket } from "../WebSocketContext"
import { PercentageBar } from "../PercentageBar";
import { StatData } from "../StatData";
import { MdCleaningServices } from "react-icons/md";
import ErrorBoundary from "../../utils/ErrorBoundary";

const getColumns = ({ onEdit, onLock, onShowCode, onShowBookingData, onDuplicate, onArchive, onAutoRgister, onCleanUp, requestloading, localData }) => [
    { field: 'id', headerName: 'ID', width: 70 },
    {
        field: 'lockRegistration', headerName: 'Active', width: 70, renderCell: (params) => {
            const value = params?.row?.lockRegistration === "true";

            return (
                <Box>
                    <span>{value ? <>
                        <MdDisabledVisible color="red" size={18} />

                    </> : <>
                        <FaCheckCircle color="green" size={18} />

                    </>}</span>
                </Box>
            );

        },
    },
    {
        field: 'page', headerName: 'Page', width: 130, renderCell: (params) => {
            const url = params?.row?.page;

            if (url) {
                const _url = `/registration/${url}`;
                return (
                    <a href={_url} style={{ textDecoration: 'none' }} target='_blank'>
                        {url}
                    </a>
                )

            }
        }
    },
    {
        field: 'metadata_json', headerName: 'Booking', width: 80, renderCell: (params) => {
            const itHasBooking = params?.row?.consultationEnabled === "true";
            if (itHasBooking) {
                const _data = JSON.parse(params?.row?.metadata_json);
                return (

                    <Box>
                        <Tooltip
                            title="Show the reserved slots"
                            componentsProps={config.tooltip_config}
                        >
                            <IconButton
                                onClick={() => onShowBookingData(_data)}
                                sx={{ textTransform: "none" }}
                            >
                                <GrSchedules color="dark" size={18} />
                            </IconButton>
                        </Tooltip>
                    </Box>

                );

            } else {
                return <></>
            }
        }
    },
    {
        field: 'paymentRequired',
        headerName: 'Payment',
        width: 80,
        renderCell: (params) => {
            return (params.value === "true" ? <FaCheckCircle color="green" size={18} /> : <></>)
        },
    },
    { field: 'title', headerName: 'Title', width: 130 },
    {
        field: 'Image',
        headerName: 'Media',
        width: 100,
        renderCell: (params) => {
            const fileUrl = `${import.meta.env.VITE_SERVERURL}/uploads/${params.value}`;
            const extension = params.value?.split('.').pop().toLowerCase();

            const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];

            if (videoExtensions.includes(extension)) {
                return (
                    <>
                        <video
                            src={fileUrl}
                            style={{ width: 50, height: 50, objectFit: 'contain', borderRadius: 4 }}
                            loop
                            autoPlay
                            muted
                            playsInline
                            preload="metadata"
                            onError={(e) => {
                                e.target.onerror = null; // prevent infinite loop
                                e.target.src = StarsField;
                            }}
                        />
                    </>
                );
            } else {
                return (
                    <img
                        onError={(e) => {
                            e.target.onerror = null; // prevent infinite loop
                            e.target.src = GECBackground;
                        }}
                        src={fileUrl}
                        alt="thumbnail"
                        style={{ width: 50, height: 50, objectFit: 'contain', borderRadius: 4 }}
                    />
                );
            }
        },

        sortable: false,
        filterable: false,
    },
    { field: 'maxTokensPerGuest', headerName: 'Max Tokens/Guest', width: 150, type: 'number' },
    {
        field: 'registration_code',
        headerName: 'Registration Code',
        width: 150,
        renderCell: (params) => {
            const code = params?.row?.registration_code;
            const use_member_card = params?.row?.use_member_card;
            const loginDisabled = params?.row?.loginRequired;
            const isLoading = requestloading.some((item) => item.id === params?.row?.id && item.field === `${params.field}`);
            


            if (use_member_card === "true") {
                return <Box>
                    <Tooltip
                        title="Users should use their Member Card ID to log in."
                        componentsProps={config.tooltip_config}
                    >

                        <FaAddressCard color="orange" size={25} />
                    </Tooltip>
                </Box>
            } else {

                if (code) {
                    return loginDisabled === "false" ? (
                        <Box>
                            {/* You can optionally show a placeholder or a "No Code" message */}
                            <strong className="text-danger">Login Disabled</strong>
                        </Box>
                    ) : (
                        <Box>
                            {/* You can optionally show a placeholder or a "No Code" message */}
                            <span>{code}</span>
                        </Box>
                    );

                } else {
                    return (
                        <Box>

                            <Tooltip
                                title="Show the Registration Code"
                                componentsProps={config.tooltip_config}
                            >
                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    style={{ textTransform: 'none' }}
                                    onClick={() => onShowCode(params.row)}
                                >
                                    {isLoading ? (<CircularProgress size={20} color="white" />) : "Code List"}

                                </Button>
                            </Tooltip>
                        </Box>
                    );
                }
            }
        },
    },


    {
        field: 'Progress',
        headerName: 'Progress',
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
            if (localData?.registration_stat?.length > 0) {
                return (
                    <Box
                        className="d-flex justify-content-center align-items-center w-100"
                        style={{ height: '100%' }}
                    >
                        {localData.registration_stat.map((x, index) =>
                            params.row.page === x.event ? (
                                <PercentageBar key={index} value={x} />
                            ) : null
                        )}
                    </Box>


                );
            } else {
                return <></>;
            }
        },
    },
    {
        field: 'Stat',
        headerName: 'Stat',
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
            if (localData?.registration_stat?.length > 0) {
                return (
                    <Box
                        className="d-flex justify-content-center align-items-center w-100"
                        style={{ height: '100%' }}
                    >
                        {localData.registration_stat.map((x, index) =>
                            params.row.page === x.event ? (
                                <div key={index}>
                                    <StatData value={x} />
                                </div>
                            ) : null
                        )}
                    </Box>

                );
            } else {
                return <></>;
            }
        },
    },
    {
        field: 'actions',
        headerName: 'Actions',
        width: 250,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
            
            const isLoadingAuto = requestloading.some((item) => item.id === params?.row?.id && item.field === `${params.field}-auto`);
            const isLoadingClean = requestloading.some((item) => item.id === params?.row?.id && item.field === `${params.field}-clean`);
            return (

                <Box>

                    <IconButton
                        title="Edit"
                        onClick={() => onEdit(params.row)}
                    >
                        <FaRegEdit color="dark" size={18} />
                    </IconButton>




                    <IconButton
                        onClick={() => onDuplicate(params.row)}
                        title="Create a duplicate registration from this configuration"
                    >
                        <IoDuplicate color="primary" size={18} />
                    </IconButton>
                    <IconButton
                        onClick={() => onArchive(params.row)}
                        title="Archive registration page"
                    >
                        <IoMdArchive color="primary" size={18} />
                    </IconButton>

                    <IconButton

                        onClick={() => onAutoRgister(params.row)}
                        title="Auto Register with G-Sheet"
                    >

                        {isLoadingAuto ? <CircularProgress size={15} /> :

                            <SiGooglesheets color="primary" size={18} />
                        }
                    </IconButton>

                    <IconButton

                        onClick={() => onCleanUp(params.row)}
                        title="Delete PKPass and QRCode files from server"
                    >

                        {isLoadingClean ? <CircularProgress size={15} /> :

                            <MdCleaningServices color="primary" size={18} />
                        }
                    </IconButton>


                    <Switch size="samll"
                        title="Switch Registration Lock"
                        checked={params.row.lockRegistration === true || params.row.lockRegistration === "true"}
                        onChange={() => onLock(params.row)}
                        color="primary"
                        sx={{
                            transform: 'scale(0.9)', // make it 1.5x larger
                            '& .MuiSwitch-switchBase': {
                                padding: 1,
                            },
                        }}
                    />
                </Box>
            )
        }
    },
];


const RegistrationList = () => {

    const { data: _data } = useWebSocket();
    const [localData, setLocalData] = useState(null);


    useEffect(() => {
        if (_data) {

            setLocalData(_data);
        }
    }, [_data]);

    const [registrationList, setRegistrationList] = useState(null);
    const [newReg, setNewReg] = useState(false);
    const [editReg, setEditReg] = useState(false);
    const [codeModal, setCodeModal] = useState(false);
    const [bookingModal, setBookingModal] = useState(false);
    const [initialData, setInitialData] = useState(null);
    const [bookingData, setBookingData] = useState(null);
    const [codeList, setCodeList] = useState(null);
    const [codeEventTitle, setCodeEventTitle] = useState(null);
    const [memberCount, setMemberCount] = useState(0);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const dialogRef = useRef();
    const {showSnackbar} = useSnackbar();
    const {openDialog} = useAlertDialog();
    const [loading, setLoading] = useState(false);
    const [requestloading, setRequestLoading] = useState([]);

    const [rowCount, setRowCount] = useState(0);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/registration-config`, {
                method: 'GET',
                credentials: "include"
            });

            const respnse_data = await response.json();
            if (!response.ok) {

                showSnackbar(respnse_data.message);
                throw new Error(response.message);
            }


            if (respnse_data) {

                setRegistrationList(respnse_data.rows);
                setRowCount(respnse_data.rows.length)
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    }, []);



    const getMemberCount = useCallback(async () => {
        try {

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/member-get-count/`, {
                method: 'GET',
                credentials: "include"
            });

            const respnse_data = await response.json();

            if (!response.ok) {

                showSnackbar(respnse_data.message);
                throw new Error(response.message);
            }


            setMemberCount(respnse_data.total.count)

        } catch (err) {
            console.error('Error fetching data:', err);
        }
    }, [])




    useEffect(() => {
        fetchData();

    }, [fetchData, setRowCount]);
    useEffect(() => {

        getMemberCount();
    }, []);



    const handleArchive = async (id) => {
        try {


            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/registration-config-archive?id=${id}`, {
                method: 'PATCH',
                credentials: "include"
            });

            const respnse_data = await response.json();
            if (!response.ok) {

                showSnackbar(respnse_data.message);
                throw new Error(response.message);
            }

            await fetchData();

        } catch (err) {
            console.error('Error fetching data:', err);
        }
    };

    const handleAutoRegister = async (row) => {
        const field = 'actions-auto';
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/google-auto-register?event=${row.page}`, {
                method: 'GET',
                credentials: "include"
            });

            const respnse_data = await response.json();
            if (!response.ok) {

                showSnackbar(respnse_data.message);
                throw new Error(response.message);
            }

            showSnackbar(respnse_data.message, "success");
            await fetchData();

        } catch (err) {
            console.error('Error fetching data:', err);

        } finally {
            setRequestLoading((prev) => prev.filter((item) => !(item.id === row.id && item.field === field)));
        }
    };
    const handleEventCleanUp = async (row) => {
        const field = 'actions-clean';
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/event-clean-up?page=${row.page}`, {
                method: 'GET',
                credentials: "include"
            });

            const respnse_data = await response.json();
            if (!response.ok) {

                showSnackbar(respnse_data.message);
                throw new Error(response.message);
            }

            showSnackbar(respnse_data.message, "success");
            await fetchData();

        } catch (err) {
            console.error('Error fetching data:', err);

        } finally {
            setRequestLoading((prev) => prev.filter((item) => !(item.id === row.id && item.field === field)));
        }
    };

    const handleDuplicateCreation = async (selectedRow) => {
        try {
            const formData = new FormData();
            for (const key in selectedRow) {
                formData.append(key, selectedRow[key]);
            }

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/registration-config/duplicate-record/`, {
                method: 'POST',
                body: formData,
                credentials: "include"
            });

            const respnse_data = await response.json();
            if (!response.ok) {

                showSnackbar(respnse_data.message);
                throw new Error(response.message);
            }

            await fetchData();

        } catch (err) {
            console.error('Error fetching data:', err);
        }
    };


    const handleSwitchLock = async (id, val) => {
        try {


            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/registration-config-switch?id=${id}&switch=${val}`, {
                method: 'PATCH',
                credentials: "include"
            });

            const respnse_data = await response.json();
            if (!response.ok) {

                showSnackbar(respnse_data.message);
                throw new Error(response.message);
            }

            await fetchData();

        } catch (err) {
            console.error('Error fetching data:', err);
        }
    };


    const showCodeList = async (row) => {
        const field = 'registration_code';
        try {

            setRequestLoading((prev) => [...prev, { id: row.id, field }]);

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/registration-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: "include",
                body: JSON.stringify({ id: row.id }),
            });

            const respnse_data = await response.json();
            if (!response.ok) {

                showSnackbar(respnse_data.message);
                throw new Error(response.message);
            }


            if (respnse_data.data) {
                setCodeEventTitle(row.title);
                setCodeList(respnse_data.data);
                setCodeModal(true);
            }

        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setRequestLoading((prev) => prev.filter((item) => !(item.id === row.id && item.field === field)));
        }
    }

    const ShowBookingData = (_data) => {
        setBookingData(_data);
        setBookingModal(true);
    };

    const openEdit = (row) => {
        const selectedRow = registrationList?.find((x) => x.id === row.id);

        if (selectedRow) {

            setInitialData(selectedRow);
            setEditReg(true);
            
        }
    };

    const switchLock = (row) => {
        if (row.lockRegistration === "false") {

            openDialog(
                <div>
                    <div>Enabling this option will <strong>lock the registration page and prevent further submissions.</strong> Are you sure you want to proceed?</div>
                    <img src={lockRegistrationImage} alt="Lock" width={400} className="mt-1 rounded-1" />
                </div>,
                'Confirm Action',
                {
                    text: 'Lock Page',
                    color: 'error'
                },
                () => {

                    const selectedRow = registrationList?.find((x) => x.id === row.id);
                    if (selectedRow) {
                        handleSwitchLock(selectedRow.id, 'true')
                    }
                },
                () => {

                },
            );
        } else {
            const selectedRow = registrationList?.find((x) => x.id === row.id);
            if (selectedRow) {
                handleSwitchLock(selectedRow.id, 'false')
            }
        }
    };



    const autoRegisterAlert = (row) => {


        openDialog(
            <div>
                Do you want to <strong>Auto Register base on the Google Sheet Geburtstagsparty </strong>
                Are you sure you want to proceed?
            </div>,
            'Confirm Action',
            {
                text: 'Confirm',
                color: 'error'
            },
            () => {

                const selectedRow = registrationList?.find((x) => x.id === row.id);

                if (selectedRow) {
                    setRequestLoading((prev) => [...prev, { id: selectedRow.id, field: "actions-auto" }]);
                    handleAutoRegister(selectedRow);
                }
            },
            () => {

            },
        );

    };


    const eventCleanUpAlert = (row) => {

        openDialog(
            <div>
                Do you want to <strong>delete PKPass and QRCode files from the server</strong>?
                Are you sure you want to proceed?
            </div>,
            'Confirm Action',
            {
                text: 'Confirm',
                color: 'error'
            },
            () => {

                const selectedRow = registrationList?.find((x) => x.id === row.id);

                if (selectedRow) {
                    setRequestLoading((prev) => [...prev, { id: selectedRow.id, field: "actions-clean" }]);
                    handleEventCleanUp(selectedRow);
                }
            },
            () => {

            },
        );

    };



    const archiveAlert = (row) => {
        openDialog(
            <div>
                Do you want to <strong>archive the registration record and hide it from active listings. </strong>
                Are you sure you want to proceed?
            </div>,
            'Confirm Action',
            {
                text: 'Archive',
                color: 'error'
            },
            () => {

                const selectedRow = registrationList?.find((x) => x.id === row.id);
                if (selectedRow) {

                    handleArchive(selectedRow.id)
                }
            },
            () => {

            },
        );

    };

    const [enableUniqueMemberCode, setEnableUniqueMemberCode] = useState(false);
    const [disableLogin, setDisableLogin] = useState(false);

    const steps = [
        'Step 1: Select Initial Event Configuration',
        'Step 2: Registration'
    ];

    const [activeStep, setActiveStep] = useState(0);
    const handleNext = () => {
        setActiveStep((prev) => prev + 1);
        
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };





    return (
        <Box sx={{ padding: 1 }}>
            
            
            <div className="d-flex justify-content-start mb-1">
                <div className="">
                    <Tooltip title="Add New Registration Page" componentsProps={config.tooltip_config}>
                    </Tooltip>
                    <Button
                        variant="outlined"
                        startIcon={<MdAddCircleOutline size={20} />}
                        onClick={() => setNewReg(true)}
                        sx={{ fontSize: 13, textTransform: 'none' }}
                    >
                        Add Registration
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
                        rowCount={rowCount}
                        rows={registrationList}
                        columns={getColumns({
                            onEdit: openEdit
                            , onLock: switchLock, onShowCode: showCodeList
                            , onShowBookingData: ShowBookingData
                            , onDuplicate: handleDuplicateCreation
                            , onArchive: archiveAlert
                            , onAutoRgister: autoRegisterAlert
                            , onCleanUp: eventCleanUpAlert
                            , requestloading: requestloading
                            , localData: localData
                        })}
                        pageSize={5}
                        rowsPerPageOptions={[5]}
                        disableSelectionOnClick
                        disableRowSelectionOnClick
                        paginationMode="server"
                    />
                </div>
            )}




            <Modal isOpen={editReg} _style={{ minWidth: '50vw', minHeight: '95vh' }}
                onRequestClose={() => {
                    setEditReg(false);
                }}
                onAfterClose={() => setInitialData(null)}
                    title={`Modify ${initialData?.title}`}>
                    <RegistrationRequestForm initialData={initialData}
                        modalSwitch={() => {
                            setEditReg(false);
                            fetchData();
                            setInitialData(null);
                        }} />
            </Modal>



            <Modal isOpen={codeModal}
                onRequestClose={() => setCodeModal(false)}
                onAfterClose={() => setCodeList(null)}
                title={`${codeEventTitle} Registration Keys`}>
                <RegistrationKeyList data={codeList} />
            </Modal>

            <Modal isOpen={bookingModal}
                onRequestClose={() => setBookingModal(false)}
                onAfterClose={() => setBookingData(null)}
                title={`Booking Status`}>
                <Slots data={bookingData} />
            </Modal>

            <Modal
                _style={activeStep === 0 ? {} : { minWidth: '50vw', minHeight: '95vh' }}
                isOpen={newReg}
                onRequestClose={() => {
                    setNewReg(false);
                    
                }}
                onAfterClose={() => { fetchData(); setActiveStep(0); }}
                title="New Registration Page">
                <Stepper activeStep={activeStep} alternativeLabel>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <div className="my-4">
                    {activeStep === 0 && (
                        <>
                            <div className="mb-4">
                                <p>
                                    There are currently <strong>{memberCount} active members</strong> in the system.
                                    Do you want to <strong>enable event code assignment</strong> for each member?
                                </p>
                                <p>
                                    Enabling this option will generate a <strong>unique access code</strong> for each member.
                                    Later, you can limit the number of registrations allowed per code.
                                </p>

                                <div className="d-flex flex-column">

                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={enableUniqueMemberCode}
                                                onChange={(e) => setEnableUniqueMemberCode(e.target.checked)}
                                                color="primary"
                                            />
                                        }
                                        label="Enable unique event codes for members"
                                    />

                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={disableLogin}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setEnableUniqueMemberCode(false)
                                                    }
                                                    setDisableLogin(e.target.checked)
                                                }}
                                                color="primary"
                                            />
                                        }
                                        label="Disable Login"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 text-end">
                                <Button variant="contained" color="primary" onClick={handleNext} sx={{ textTransform: 'none' }}>
                                    Next
                                </Button>
                            </div>
                        </>
                    )}

                    {activeStep === 1 && (
                        <>
                            <RegistrationRequestForm
                                initialData={null}
                                uniqeCodeAccess={memberCount}
                                enableUniqueMemberCode={enableUniqueMemberCode}
                                disableLogin={disableLogin}
                                modalSwitch={() => {
                                    setNewReg(false);
                                    setActiveStep(0); // reset step on close
                                    fetchData();
                                }}
                            />
                            <div className="mt-2 text-end">
                                <Button variant="outlined" onClick={handleBack} className="me-2" sx={{ textTransform: 'none' }}>
                                    Back
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </Box>
    );
};


export default RegistrationList;