import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../WebSocketContext';
import { TbTrashX } from "react-icons/tb";
// import MyDocument from './MyDocument';
const MyDocument = React.lazy(() => import('./MyDocument'));

import CircularProgress from "@mui/material/CircularProgress";
import { PDFDownloadLink } from '@react-pdf/renderer';
import { IoSave } from "react-icons/io5";
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { VscNewFile } from "react-icons/vsc";
import { useSnackbar } from '../../Providers/Snackbar';
import { useAlertDialog } from '../../Providers/AlertProvider';
import InvoiceDownload from './InvoiceDownload';
const deletedItemTemplate = {
    deleted: true,
    title: "Item Title",
    price: "",
    qty: "1",
    disc: "0.00",
    vat: "0.00",
    vat_p: "0",
    amount: "",
    body: ""
};

const FileList = ({ onSelect, formData, initialFormData, loadingFlag }) => {

    const { showSnackbar } = useSnackbar();
    const { openDialog } = useAlertDialog();
    const iconSize = 24;
    const { onEvent } = useWebSocket();
    const dialogRef = useRef();

    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState('');
    const [temp, setTemp] = useState(null);
    const [referenceLength, setReferenceLength] = useState(0);
    const [fileList, setFileList] = useState([]);

    const filteredList = fileList.filter(item =>
        item.project.project_name.toLowerCase().includes(searchTerm.toLowerCase())


    );

    const { sendRequest } = useWebSocket();


    const Save = async () => {
        try {

            let warning_message;
            if (selectedItem !== formData.project.project_name && fileList.some(item => item.project.project_name.includes(formData.project.project_name))) {
                formData.project.project_name = `${formData.project.project_name} ${Date.now()}`;
                warning_message = 'There is another file with the same project name you entered, so a random number will be added to the end to prevent overwriting.'
                window.alert('There is another file with the same project name you entered, so a random number will be added to the end to prevent overwriting.');
            }

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/invoice-save`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ data: formData }),
            });

            const respnse_data = await response.json();
            if (!response.ok) {

                showSnackbar(respnse_data.message);
                throw new Error(response.message);
            }


            if (respnse_data) {
                showSnackbar(`${respnse_data.message}`, 'success');
                sendRequest("invoice");

            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {

        }
    };




    const handleSelect = (k) => {

        if (temp) {


            // Reference length to compare against — adjust as needed
            const referenceLength = temp.items.length;

            // Make a copy of items to avoid mutating input
            let newItems = [...(k.items || [])];

            // Add deleted items until lengths match
            while (newItems.length < referenceLength) {
                newItems.push({ ...deletedItemTemplate });
            }

            // Create a new object with updated items
            const updatedSelection = {
                ...k,
                items: newItems,
            };

            setSelectedItem(k.project.project_name);
            setTemp(updatedSelection)


            onSelect(updatedSelection);
        } else {
            setSelectedItem(k.project.project_name);
            setTemp(k)
            onSelect(k);

        }
    };


    const handleDelete = async (projectName) => {
        try {

            const res = await fetch(`${import.meta.env.VITE_SERVERURL}/api/invoice-list-delete?projectName=${projectName}`, {
                method: "GET",
                credentials: "include",
            });

            if (res.status === 401) {

                console.warn("Unauthorized");
                return;
            }

            const respnse_data = await res.json();
            if (res.ok) {
                showSnackbar(respnse_data.message);
                fetchData();
            }


        } catch (err) {
            console.error(err);

        } finally {

        }
    }


    const confirmDelete = (projectName) => {

        openDialog(
            <>
                Deleting this file will <strong>permanently remove it and its data. </strong>
                Are you sure you want to proceed?

            </>,
            'Delete', {
            text: 'Delete',
            color: 'error'
        },
            () => {

                handleDelete(projectName)

            },
            () => {
                // Cancelled: do nothing
            }
        );




    }

    const fetchData = useCallback(async () => {
        try {

            const res = await fetch(`${import.meta.env.VITE_SERVERURL}/api/invoice-list`, {
                method: "GET",
                credentials: "include",
            });

            if (res.status === 401) {

                console.warn("Unauthorized");


                return;
            }

            if (res.ok) {
                const data = await res.json();
                setFileList(data.data);
            }


        } catch (err) {
            console.error(err);

        } finally {

        }
    }, [])


    useEffect(() => {
        fetchData();


    }, [])

    useEffect(() => {
        const unsubscribe = onEvent("invoice:update", (data) => {
            fetchData();
        });

        return unsubscribe;
    }, [onEvent]);

    return (
        <div style={{ height: '82dvh' }}>

            <div className='d-flex justify-content-between align-items-center'>

                <div>

                    <IconButton
                        title="Save"
                        onClick={Save}
                    >
                        <IoSave color="#5C6BC0" size={iconSize} />
                    </IconButton>
                                                <Button
                    color="success"
                                                    variant="contained"
                                                    startIcon={<VscNewFile size={20} />}
                                                    onClick={() => { handleSelect(initialFormData) }}
                                                    sx={{ fontSize: 12, textTransform: 'none', wordBreak: 'break-all', paddingY: '1px', paddingX: '10px' }}
                                                >
                                                    New File
                                                </Button>

                  
                </div>

                <InvoiceDownload iconSize={iconSize} formData={formData} loadingFlag={loadingFlag} />

            </div>

            <div className='rounded border p-2'>
                {/* Search box */}
                <input
                    type="text"
                    className="form-control mb-1 shadow-sm"
                    placeholder="Search files..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        transition: 'all 0.2s ease-in-out',

                        maxWidth: '250px'
                    }}
                />

                {/* List */}
                <div style={{ overflow: 'scroll', height: '76vh' }}>

                    <ul className="list-unstyled p-0 m-0 list-group" >
                        {filteredList.length > 0 ? (
                            filteredList.map((k) => (
                                <li
                                    onClick={() => handleSelect(k)}
                                    title={k.project.project_name}
                                    key={k.project.project_name}
                                    className={`d-flex justify-content-between align-items-center p-1 mb-1 mt-1 rounded list-group-item ${selectedItem === k.project.project_name ? "active" : ""} hover-li`}
                                    style={{
                                        transition: 'all 0.2s ease-in-out',
                                        cursor: 'pointer',

                                    }}
                                >
                                    <span style={{
                                        maxWidth: '250px',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap',
                                        fontSize: 14
                                    }}>

                                        {k.project.project_name}
                                    </span>
                                    <IconButton onClick={() => confirmDelete(k.project.project_name)} sx={{
                                        color: "#1976d2",
                                        "&:hover": { backgroundColor: "#e3f2fd" },
                                    }}>
                                        <TbTrashX size={20} />
                                    </IconButton>
                                </li>
                            ))
                        ) : (
                            <li className="text-muted fst-italic ">No file to display</li>
                        )}
                    </ul>
                </div>
            </div>

        </div>
    );
};

export default FileList;
