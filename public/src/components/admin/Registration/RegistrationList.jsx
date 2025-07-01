import { useEffect, useState, useRef, useCallback } from "react";
import Modal from "../../Modal";
import RegistrationRequestForm from "../RegistrationRequestForm";
import { DataGrid } from '@mui/x-data-grid';
import { Switch, Button, Box, Tooltip } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';

const getColumns = ({ onEdit, onLock }) => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'page', headerName: 'Page', width: 130 },
    {
        field: 'paymentRequired',
        headerName: 'Payment Required',
        width: 150,
        valueFormatter: (params) => (params.value === "true" ? "Yes" : "No"),
    },
    // {
    //     field: 'birthdayRequired',
    //     headerName: 'Birthday Required',
    //     width: 150,
    //     valueFormatter: (params) => (params.value === "true" ? "Yes" : "No"),
    // },
    // {
    //     field: 'companyRequired',
    //     headerName: 'Company Required',
    //     width: 150,
    //     valueFormatter: (params) => (params.value === "true" ? "Yes" : "No"),
    // },
    // {
    //     field: 'lockRegistration',
    //     headerName: 'Lock Registration',
    //     width: 150,
    //     valueFormatter: (params) => (params.value === "true" ? "Yes" : "No"),
    // },
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
                <Tooltip title="Switch Registration Lock">
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


export const RegistrationList = ({ data }) => {

    const [registrationList, setRegistrationList] = useState(null);
    const [newReg, setNewReg] = useState(false);
    const [editReg, setEditReg] = useState(false);
    const [initialData, setInitialData] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/registration-config`, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch');
            }

            const values = await response.json();
            debugger;
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
        debugger;
        if (selectedRow) {

            setInitialData(selectedRow);
            setEditReg(true);
        }
    };

    const switchLock = (row) => {
        const selectedRow = registrationList?.rows?.find((x) => x.id === row.id);
        if (selectedRow) {
            selectedRow.Image = null;
            handleEdit(selectedRow)
        }
    };

    return (
        <div className="gallery-events">
            <span className="gallery-header">
                <h4>

                </h4>
                <span>
                    <button className="cta-button blue" onClick={() => setNewReg(true)}>
                        <img alt="add-item" src="/add-item.svg"></img>

                    </button>
                </span>
            </span>

            <div style={{ width: '100%', overflowX: 'auto' }}>
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
                    <Box sx={{ display: 'flex', justifySelf: 'center' }}>
                        <CircularProgress />
                    </Box>
                }

                <Modal isOpen={editReg}
                    onRequestClose={() => setEditReg(false)}
                    title={`Modify ${initialData?.title}`}>
                    <RegistrationRequestForm initialData={initialData}  modalSwitch={() => {
                        setEditReg(false); 
                        fetchData();
                    }}/>
                </Modal>

            </div>
            <Modal isOpen={newReg}
                onRequestClose={() => setNewReg(false)}
                title={"New Registration Page"}>
                <RegistrationRequestForm initialData={null} 
                    modalSwitch={() => {
                        setNewReg(false); 
                        fetchData();
                    }}/>
            </Modal>
        </div>
    );
};