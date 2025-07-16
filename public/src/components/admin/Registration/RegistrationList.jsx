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



const getColumns = ({ onEdit, onLock, onShowCode }) => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'lockRegistration', headerName: 'Active Page', width: 150,renderCell: (params) => {
    const value = params?.row?.lockRegistration === "true";
        
    return (
      <Box>
        <span>{value ? "Not Active" : "Active"}</span>
      </Box>
    );
   
  }, },
    { field: 'page', headerName: 'Page', width: 130, renderCell: (params) => {
        const url = params?.row?.page;
        
        if (url) {
            const _url = `/registration/${url}`;
        return (
           <a href={_url} style={{ textDecoration: 'none' }} target='_black'>
               {url}
            </a>
        )
        
        }
    } },
    {
        field: 'paymentRequired',
        headerName: 'Payment Required',
        width: 150,
        valueFormatter: (params) => (params.value === "true" ? "Yes" : "No"),
    },
    { field: 'title', headerName: 'Title', width: 130 },
    {
        field: 'Image',
        headerName: 'Image',
        width: 100,
        renderCell: (params) => (
            <img
                src={`${import.meta.env.VITE_SERVERURL}/uploads/${params.value}`}
                alt="thumbnail"
                style={{ width: 50, height: 50, objectFit: 'contain', borderRadius: 4 }}
            />
        ),
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
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/registration-config`, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch');
            }

            const values = await response.json();
            
            if(values){

                setRegistrationList(values.rows);
                setRowCount(values.rows.length)
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        }finally{
             setLoading(false);
        }
    }, []);



    const getMemberCount = useCallback(async () => {
        try {

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/member-get-count/`, {
                method: 'GET',
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
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/registration-config/switch-registration-lock/`, {
                method: 'POST',
                body: formData,
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


    const showCodeList = async (row) =>{
        try {

             const response = await fetch(`${import.meta.env.VITE_SERVERURL}/registration-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: row.id }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch registration keys');
            }

            const result = await response.json();
            if(result.data){
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
        dialogRef.current.openDialog(
            <div>
                <p>Enabling this option will lock the registration page and prevent further submissions. Are you sure you want to proceed?</p>
                <img src={lockRegistrationImage} alt="Lock" style={{ maxWidth: '100%', marginTop: 8 }} />
            </div>,
            'Confirm Action',
            () => {

                const selectedRow = registrationList?.rows?.find((x) => x.id === row.id);
                if (selectedRow) {
                    selectedRow.Image = null;
                    handleSwitchLock(selectedRow)
                }
            },
            () => {

            }
        );

    };

    const [enableUniqueMemberCode, setEnableUniqueMemberCode] = useState(false);

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

    const handleClose = () => {
        
        
    };


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
                onRequestClose={() => { setEditReg(false);  ;setInitialData(null); setIsParentModalOpen(false)}}
                title={`Modify ${initialData?.title}`}>
                <RegistrationRequestForm initialData={initialData} isParentModalOpen={isParentModalOpen} modalSwitch={() => {
                    setEditReg(false);
                    setIsParentModalOpen(false);
                    fetchData();
                    setInitialData(null);
                }} />
            </Modal>


            <Modal isOpen={codeModal}
                onRequestClose={() => { setCodeList(null); setCodeModal(false);}}
                title={`${codeEventTitle} Registration Keys`}>
                <RegistrationKeyList data={codeList} />
            </Modal>



            <Modal isOpen={newReg} onRequestClose={() => {setNewReg(false);
                                    setIsParentModalOpen(false);
                                    setActiveStep(0); // reset step on close

                                    fetchData();}} title="New Registration Page">
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
                            </div>

                            <div className="mt-4 text-end">
                                <Button variant="contained" color="primary" onClick={handleNext} sx={{textTransform: 'none'}}>
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
                                modalSwitch={() => {
                                    setNewReg(false);
                                    setIsParentModalOpen(false);
                                    setActiveStep(0); // reset step on close

                                    fetchData();
                                }}
                            />
                            <div className="mt-2 text-end">
                                <Button variant="outlined" onClick={handleBack} className="me-2" sx={{textTransform: 'none'}}>
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