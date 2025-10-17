import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../WebSocketContext';
import { IoTrashOutline } from "react-icons/io5";
import { IconButton } from '@mui/material';
import AlertDialog from '../../utils/AlertDialog';

const FileList = ({ onSelect }) => {


    const { onEvent } = useWebSocket();
    const dialogRef = useRef();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState('');
    const [fileList, setFileList] = useState([]);

    const filteredList = fileList.filter(item =>
        item.project.project_name.toLowerCase().includes(searchTerm.toLowerCase())


    );

    useEffect(() => {
        console.log()
    }, []);

    const handleSelect = (k) => {
        setSelectedItem(k.page);
        onSelect(k.page);
    }


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

            if (res.ok) {
                fetchData();
            }


        } catch (err) {
            console.error(err);

        } finally {

        }
    }


    const confirmDelete = (projectName) => {


        dialogRef.current.openDialog(
            <div>
                Deleting this file will <strong>permanently remove it and its data. </strong>
                 Are you sure you want to proceed?

            </div>,
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
            <AlertDialog ref={dialogRef} />
            <div className='rounded border p-2'>
                {/* Search box */}
                <input
                    type="text"
                    className="form-control mb-1 shadow-sm"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        transition: 'all 0.2s ease-in-out',

                        maxWidth: '250px'
                    }}
                />

                {/* List */}
                <div style={{ overflow: 'scroll', height: '75.5vh' }}>

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
                                    <IconButton onClick={() => confirmDelete(k.project.project_name)}>
                                        <IoTrashOutline color="red" size={18} />
                                    </IconButton>
                                </li>
                            ))
                        ) : (
                            <li className="text-muted fst-italic ">No file to display</li>
                        )}
                    </ul>
                </div>
            </div>

            {/* Optional quick style: inline CSS or add to your stylesheet */}
            <style jsx>{`
        .hover-item:hover {
          background-color: #e9ecef;
          transform: scale(1.02);
        }
      `}</style>
        </div>
    );
};

export default FileList;
