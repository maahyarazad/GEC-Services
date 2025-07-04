import React, { useImperativeHandle, forwardRef, useState } from 'react';
import { Button, Box } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import { IoMdClose } from "react-icons/io";
import 'sweetalert2/dist/sweetalert2.min.css';

const SimpleSnackbar = forwardRef((_, ref) => {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

    useImperativeHandle(ref, () => ({
        openSnackbar(newMessage, messageType) {
            setMessage(newMessage || ""); // Allow passing new message
            setMessageType(messageType)
            setOpen(true);
        },
        closeSnackbar() {
            setOpen(false);
        }
    }));

    const handleClose = (_, reason) => {
        if (reason === 'clickaway') return;
        setOpen(false);
    };

    const action = (
        <>
            <span
                size="small"
                aria-label="close"
                color="inherit"
                onClick={handleClose}
                style={{ cursor: 'pointer' }}
            >
                <IoMdClose fontSize="24px" />
            </span>
        </>
    );

    return (
        <Snackbar
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                slotProps={{
                    content: {
                        sx: {
                            fontSize: '1.2rem',
                            backgroundColor: '#f7f7f7', // example background
                            color: '#141414',
                            padding: '16px 24px',
                            borderRadius: '8px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                        },
                    }
                }}
                open={open}
                autoHideDuration={999999}
                onClose={handleClose}
                message={
                <div className='d-flex align-items-center'>
                        <div className='row'>
                            <div className='col-1 d-flex justify-content-center align-items-center'>
                                {
                                    messageType === 'success' ?
                                
                                        <div className="swal2-success" >
                                            <div className="swal2-success-line-tip"></div>
                                            <div className="swal2-success-line-long"></div>
                                        </div>
                                        :
                                        <div className="swal2-error" ></div>
                                }
                            </div>
                            <div className='col-10 d-flex justify-content-center align-items-center' >
                                {message}
                            </div>
                            <div className='col-1 d-flex justify-content-center align-items-center'>
                                {action}
                            </div>
                        </div>



                    

                </div>
            }
        />
    );
});

export default SimpleSnackbar;
