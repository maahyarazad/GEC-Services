import React, { useImperativeHandle, forwardRef, useState } from 'react';
import { useMediaQuery, Snackbar } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IoMdClose } from "react-icons/io";
import 'sweetalert2/dist/sweetalert2.min.css';


import Slide from '@mui/material/Slide';

// Add this helper function for transition
function SlideTransition(props) {
  return <Slide {...props} direction="down" />; // slide from top
}

const SimpleSnackbar = forwardRef((_, ref) => {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");


      const theme = useTheme();

  // true if screen width is >= 960px (desktop)
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));

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
            TransitionComponent={SlideTransition}
            anchorOrigin={{
                vertical: 'top',
                horizontal: isLargeScreen ? 'right' : 'center',
            }}
            slotProps={{
                content: {
                sx: {
                    fontSize: { xs: '1rem', sm: '1.2rem' },
                    backgroundColor: '#f7f7f7',
                    color: '#141414',
                    padding: { xs: '12px 16px', sm: '16px 24px' },
                    margin: 0,
                    borderRadius: '8px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: 'center',
                    width: '90%',
                    maxWidth: 700,
                    minWidth: { lg: 400 },   
                    '& .MuiSnackbarContent-message': {

                        width: '100%',
                        margin: 0
                    },
                },
                },
            }}
            open={open}
            autoHideDuration={5000}
            onClose={handleClose}
            message={

                <div className='d-flex justify-content-between col'>
                    <div className='d-flex justify-content-start col-9'>
                        <div className="d-flex justify-content-start align-items-center">
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
                        <div className='ps-2 d-flex justify-content-start align-items-center' >
                            {message}
                        </div>
                    </div>

                    <div className='d-flex justify-content-end align-items-center col-3'>
                        {action}
                    </div>
                </div>
            }
        />
    );
});

export default SimpleSnackbar;
