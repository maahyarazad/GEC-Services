import { useEffect, useState, useRef } from "react";
import Modal from "../../Modal";
import RegistrationRequestForm from "../RegistrationRequestForm";
import { DataGrid } from '@mui/x-data-grid';
import { Button, Box } from '@mui/material';
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
  {
    field: 'birthdayRequired',
    headerName: 'Birthday Required',
    width: 150,
    valueFormatter: (params) => (params.value === "true" ? "Yes" : "No"),
  },
  {
    field: 'companyRequired',
    headerName: 'Company Required',
    width: 150,
    valueFormatter: (params) => (params.value === "true" ? "Yes" : "No"),
  },
  {
    field: 'lockRegistration',
    headerName: 'Lock Registration',
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
        src={params.value}
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
          style={{ marginRight: 8 }}
          onClick={() => onEdit(params.row)}
        >
          Edit
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={() => onLock(params.row)}
        >
          Lock Registration
        </Button>
      </Box>
    ),
  },
];


export const RegistrationList = ({ data }) => {

    const [registrationList, setRegistrationList] = useState(null);
    const [newReg, setNewReg] = useState(false);
    const [editReg, setEditReg] = useState(false);
    const [initialData , setInitialData] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_SERVERURL}/registration-config`, {
                    method: 'GET',
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch');
                }

                const values = await response.json();
                console.log(values);
                setRegistrationList(values);
                debugger;

            } catch (err) {
                console.error('Error fetching data:', err);
            }
        };

        fetchData();
    }, []);


    const handleEdit = (row) => {
        console.log("Editing:", row);

        const selectedRow = registrationList?.rows?.find((x) => x.id === row.id);
        if (selectedRow) {
            setInitialData(selectedRow);
            setEditReg(true);
        }

    };

    const handleLock = (row) => {
        console.log("Locking:", row);
        setInitialData(registrationList.find(x=> x.id === row))
        debugger;
    };

    return (
        <div className="gallery-events">
            <span className="gallery-header">
                <h4>

                </h4>
                <span>
                    <button className="cta-button blue" onClick={() => setIsOpen(true)}>
                        <img alt="add-item" src="/add-item.svg"></img>

                    </button>
                </span>
            </span>

            <div style={{ width: '100%', overflowX: 'auto' }}>
                {registrationList 
                ?
                    <div style={{ height:'100%' }}>
                        <DataGrid
                            rows={registrationList.rows}
                             columns={getColumns({ onEdit: handleEdit, onLock: handleLock })}
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
                        title={"New Registration Page"}>
                        <RegistrationRequestForm initialData={initialData}/>
                    </Modal>

            </div>
            <Modal isOpen={newReg}
                onRequestClose={() => setNewReg(false)}
                title={"New Registration Page"}>
                <RegistrationRequestForm />
            </Modal>
        </div>
    );
};