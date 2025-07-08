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


const getColumns = ({ onEdit, onLock }) => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'page', headerName: 'Page', width: 130 },
    {
        field: 'paymentRequired',
        headerName: 'Payment Required',
        width: 150,
        valueFormatter: (params) => (params.value === "true" ? "Yes" : "No"),
    },
    { field: 'title', headerName: 'Title', width: 130 },
    { field: 'description', headerName: 'Description', width: 150 },
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
    { field: 'registration_code', headerName: 'Registration Code', width: 150 },
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
    const [initialData, setInitialData] = useState(null);
    const dialogRef = useRef();

    const fetchData = useCallback(async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/registration-config`, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch');
            }

            const values = await response.json();

            setRegistrationList(values);
            console.log('Fetched registrations:', values);
        } catch (err) {
            console.error('Error fetching data:', err);
        }
    }, []);



    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEdit = async (selectedRow) => {
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


    const openEdit = (row) => {
        const selectedRow = registrationList?.rows?.find((x) => x.id === row.id);

        if (selectedRow) {

            setInitialData(selectedRow);
            setEditReg(true);
        }
    };

    const switchLock = (row) => {
        dialogRef.current.openDialog(
            <div>
                Enabling this option will lock the registration page and prevent further submissions. Are you sure you want to proceed?
                <img src={lockRegistrationImage} alt="Lock" style={{ maxWidth: '100%', marginTop: 8 }} />
            </div>,
            'Confirm Action',
            () => {

                const selectedRow = registrationList?.rows?.find((x) => x.id === row.id);
                if (selectedRow) {
                    selectedRow.Image = null;
                    handleEdit(selectedRow)
                }
            },
            () => {
                
            }
        );

    };

  const [assignEventCode, setAssignEventCode] = useState(false);

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

  const handleClose = () => {
    setNewReg(false);
    setActiveStep(0); // reset step on close
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


          
                {registrationList
                    ?
                    <div style={{ height: '100%' }}>
                        <DataGrid
                            rows={registrationList.rows}
                            columns={getColumns({ onEdit: openEdit, onLock: switchLock })}
                            pageSize={5}
                            rowsPerPageOptions={[5]}
                            disableSelectionOnClick
                        />
                    </div>
                    :
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress />
                    </Box>
                }

                <Modal isOpen={editReg}
                    onRequestClose={() => {setEditReg(false);  setInitialData(null);}}
                    title={`Modify ${initialData?.title}`}>
                    <RegistrationRequestForm initialData={initialData} modalSwitch={() => {
                        setEditReg(false);
                        fetchData();
                        setInitialData(null);
                    }} />
                </Modal>

           


    <Modal isOpen={newReg} onRequestClose={() => setNewReg(false)} title="New Registration Page">
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
            There are currently <strong>10 active members</strong> in the system.
            Do you want to <strong>enable event code assignment</strong> for each member?
          </p>
          <p>
            Enabling this option will generate a <strong>unique access code</strong> for each member.
            Later, you can limit the number of registrations allowed per code.
          </p>

          <FormControlLabel
            control={
              <Switch
                checked={assignEventCode}
                onChange={(e) => setAssignEventCode(e.target.checked)}
                color="primary"
              />
            }
            label="Enable unique event codes for members"
          />
        </div>

        <div className="mt-4 text-end">
          <Button variant="contained" color="primary" onClick={handleNext}>
            Next
          </Button>
        </div>
      </>
    )}

    {activeStep === 1 && (
      <>
        <RegistrationRequestForm
          initialData={null}
          assignEventCode={assignEventCode}
          modalSwitch={() => {
            handleClose();
            fetchData();
          }}
        />
        <div className="mt-4 text-end">
          <Button variant="outlined" onClick={handleBack} className="me-2">
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