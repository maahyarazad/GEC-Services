import { useEffect, useState, useRef, useCallback } from "react";
import Modal from "../../Modal";
import RegistrationRequestForm from "../RegistrationRequestForm";
import { DataGrid } from '@mui/x-data-grid';
import { Switch, Button, Box, Tooltip } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { MdFormatListBulletedAdd } from "react-icons/md";
import AlertDialog from '../../utils/AlertDialog';

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
        headerName: 'Actions',
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
            console.log('Fetched config:', configData);
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
            'Are you sure you want to continue?',
            'Switching Registration Lock',
            () => {

                const selectedRow = registrationList?.rows?.find((x) => x.id === row.id);
                if (selectedRow) {
                    selectedRow.Image = null;
                    handleEdit(selectedRow)
                }
            },
            () => {
                console.log('❌ Cancel clicked');

            }
        );

    };

    return (
        <div className="gallery-events">
            <AlertDialog ref={dialogRef} />
            <div className="d-flex justify-content-end">
                <div className="me-4 pt-4">
                    <Tooltip title="Add New Registration Page" componentsProps={{ tooltip: { sx: { fontSize: 14 } } }}>
                        <MdFormatListBulletedAdd onClick={() => setNewReg(true)} size={30} className="text-primary" style={{ cursor: 'pointer' }}
                        />
                    </Tooltip>
                </div>
            </div>


            <div style={{ width: '100%', height: '85vh' }}>
                <Box sx={{ padding: 2 }}>

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
                </Box>

                <Modal isOpen={editReg}
                    onRequestClose={() => setEditReg(false)}
                    title={`Modify ${initialData?.title}`}>
                    <RegistrationRequestForm initialData={initialData} modalSwitch={() => {
                        setEditReg(false);
                        fetchData();
                        setInitialData(null);
                    }} />
                </Modal>

            </div>
            <Modal isOpen={newReg}
                onRequestClose={() => setNewReg(false)}
                title={"New Registration Page"}>
                <RegistrationRequestForm initialData={null}
                    modalSwitch={() => {
                        setNewReg(false);
                        fetchData();

                    }} />
            </Modal>
        </div>
    );
};