import { useEffect, useState, useRef, useCallback } from "react";
import Modal from "../../Modal";
import RegistrationRequestForm from "../RegistrationRequestForm";
import { DataGrid } from '@mui/x-data-grid';
import { Switch, Button, Box, Tooltip, FormControlLabel } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { MdFormatListBulletedAdd } from "react-icons/md";
import AlertDialog from '../../utils/AlertDialog';
import lockRegistrationImage from '../../../assets/media/lock_registration.png'
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import RegistrationKeyList from '../Registration/RegistrationKeyList'
import { FaCheckCircle } from "react-icons/fa";
import { MdDisabledVisible } from "react-icons/md";
import { FaAddressCard } from "react-icons/fa";
import GECBackground from "../../../assets/media/GECBackground.webp";
import StarsField from "../../../assets/media/stars-field.webm";
import { IoIosInformationCircleOutline } from "react-icons/io";

const getColumns = ({ onEdit, onLock, onShowCode }) => [
    { field: 'id', headerName: 'ID', width: 70 },
    {
        field: 'lockRegistration', headerName: 'Active Page', width: 100, renderCell: (params) => {
            const value = params?.row?.lockRegistration === "true";

            return (
                <Box>
                    <span>{value ? <>
                    <MdDisabledVisible color="red" size={18} />
                    
                    </> :  <>
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
                    <a href={_url} style={{ textDecoration: 'none' }} target='_black'>
                        {url}
                    </a>
                )

            }
        }
    },
    {
        field: 'paymentRequired',
        headerName: 'Payment Required',
        width: 150,
        valueFormatter: (params) => (params.value === "true" ? "Yes" : "No"),
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
            if(use_member_card === "true"){
                return <Box>
                             <Tooltip
                                title="Users should use their email and the Member CardId to login"
                                componentsProps={{ tooltip: { sx: { fontSize: 14 } } }}
                            >
                                
                                <FaAddressCard color="orange" size={25}/>
                            </Tooltip>
                        </Box>
            }else{
                
                if (code) {
                    return (
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
                                componentsProps={{ tooltip: { sx: { fontSize: 14 } } }}
                            >
                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    style={{ textTransform: 'none' }}
                                    onClick={() => onShowCode(params.row)}
                                >
                                    Code List
                                </Button>
                            </Tooltip>
                        </Box>
                    );
                }
            }
        },
    },


    {
        field: 'actions',
        headerName: 'Actions - Page Lock',
        width: 180,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
            <Box>
                <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    style={{ marginRight: 8, textTransform: 'none' }}
                    onClick={() => onEdit(params.row)}
                >
                    Edit
                </Button>
                <Tooltip title="Switch Registration Lock" componentsProps={{ tooltip: { sx: { fontSize: 14 } } }}>
                    <Switch
                        checked={params.row.lockRegistration === true || params.row.lockRegistration === "true"}
                        onChange={() => onLock(params.row)}
                        color="primary"
                    />
                </Tooltip>


            </Box>
        ),
    },
];


export const RegistrationList = () => {

    const [registrationList, setRegistrationList] = useState(null);
    const [newReg, setNewReg] = useState(false);
    const [editReg, setEditReg] = useState(false);
    const [codeModal, setCodeModal] = useState(false);
    const [initialData, setInitialData] = useState(null);
    const [codeList, setCodeList] = useState(null);
    const [codeEventTitle, setCodeEventTitle] = useState(null);
    const [memberCount, setMemberCount] = useState(0);
    const [isParentModalOpen, setIsParentModalOpen] = useState(false);
    const dialogRef = useRef();
    const [loading, setLoading] = useState(false);
    const [rowCount, setRowCount] = useState(0);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/registration-config`, {
                method: 'GET',
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error('Failed to fetch');
            }

            const values = await response.json();

            if (values) {

                setRegistrationList(values.rows);
                setRowCount(values.rows.length)
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

            if (!response.ok) {
                throw new Error('Failed to fetch registration data');
            }

            const values = await response.json();
            setMemberCount(values.total.count)

        } catch (err) {
            console.error('Error fetching data:', err);
        }
    }, [])




    useEffect(() => {
        fetchData();
        getMemberCount();
    }, [fetchData, getMemberCount, setRowCount]);


    const handleSwitchLock = async (selectedRow) => {
        try {
            const formData = new FormData();
            for (const key in selectedRow) {
                formData.append(key, selectedRow[key]);
            }
            
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/registration-config/switch-registration-lock/`, {
                method: 'POST',
                body: formData,
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error('Failed to fetch registration data');
            }

            const configData = await response.json();
            fetchData();

        } catch (err) {
            console.error('Error fetching data:', err);
        }
    };


    const showCodeList = async (row) => {
        try {

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/registration-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: "include",
                body: JSON.stringify({ id: row.id }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch registration keys');
            }

            const result = await response.json();
            if (result.data) {
                setCodeEventTitle(row.title);
                setCodeList(result.data);
                setCodeModal(true);
            }

        } catch (err) {
            console.error('Error fetching data:', err);
        }
    }

    const openEdit = (row) => {
        const selectedRow = registrationList?.find((x) => x.id === row.id);

        if (selectedRow) {

            setInitialData(selectedRow);
            setEditReg(true);
            setIsParentModalOpen(true);
        }
    };

    const switchLock = (row) => {
        
        if(row.lockRegistration === "false"){

            dialogRef.current.openDialog(
                <div>
                    <p>Enabling this option will lock the registration page and prevent further submissions. Are you sure you want to proceed?</p>
                    <img src={lockRegistrationImage} alt="Lock" style={{ maxWidth: '100%', marginTop: 8 }} />
                </div>,
                'Confirm Action',
                () => {
                    
                    const selectedRow = registrationList?.find((x) => x.id === row.id);
                    if (selectedRow) {
                        selectedRow.Image = null;
                        handleSwitchLock(selectedRow)
                    }
    
                },
                () => {
    
                },
            );
        }else{
            const selectedRow = registrationList?.find((x) => x.id === row.id);
                    if (selectedRow) {
                        selectedRow.Image = null;
                        handleSwitchLock(selectedRow)
                    }
        }

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
        setIsParentModalOpen(true);
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const timeoutRef = useRef(null);

    const handleModalClose = () => {
        setEditReg(false);
        setIsParentModalOpen(false);
        timeoutRef.current = setTimeout(() => {
            setInitialData(null);
        }, 200);
    };

        useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <Box sx={{ padding: 1 }}>
            <AlertDialog ref={dialogRef} />
            <div className="d-flex justify-content-start mb-1">
                <div className="">
                    <Tooltip title="Add New Registration Page" componentsProps={{ tooltip: { sx: { fontSize: 14 } } }}>
                    </Tooltip>
                    <Button
                        variant="outlined"
                        startIcon={<MdFormatListBulletedAdd size={24} />}
                        onClick={() => setNewReg(true)}
                        sx={{ fontSize: 14, textTransform: 'none' }}
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
                        columns={getColumns({ onEdit: openEdit, onLock: switchLock, onShowCode: showCodeList })}
                        pageSize={5}
                        rowsPerPageOptions={[5]}
                        disableSelectionOnClick
                        disableRowSelectionOnClick
                        paginationMode="server"
                    />
                </div>
            )}



            <Modal isOpen={editReg}
                onRequestClose={handleModalClose}
                title={`Modify ${initialData?.title}`}>
                <RegistrationRequestForm initialData={initialData} isParentModalOpen={isParentModalOpen} modalSwitch={() => {
                    setEditReg(false);
                    setIsParentModalOpen(false);
                    fetchData();
                    setInitialData(null);
                }} />
            </Modal>


            <Modal isOpen={codeModal}
                onRequestClose={() => { setCodeList(null); setCodeModal(false); }}
                title={`${codeEventTitle} Registration Keys`}>
                <RegistrationKeyList data={codeList} />
            </Modal>



            <Modal isOpen={newReg} onRequestClose={() => {
                setNewReg(false);
                setIsParentModalOpen(false);
                setActiveStep(0); // reset step on close

                fetchData();
            }} title="New Registration Page">
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
                                                if(e.target.checked){
                                                    setEnableUniqueMemberCode(false)
                                                }
                                                setDisableLogin(e.target.checked)}}
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
                                isParentModalOpen={isParentModalOpen}
                                initialData={null}
                                uniqeCodeAccess={memberCount}
                                enableUniqueMemberCode={enableUniqueMemberCode}
                                disableLogin={disableLogin}
                                modalSwitch={() => {
                                    setNewReg(false);
                                    setIsParentModalOpen(false);
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