import React, { useImperativeHandle, forwardRef, useState } from 'react';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { IoMdClose } from "react-icons/io";

const SimpleSnackbar = forwardRef((_, ref) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  useImperativeHandle(ref, () => ({
    openSnackbar(newMessage) {
      setMessage(newMessage || ""); // Allow passing new message
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
      <Button color="primary" size="small" onClick={handleClose}></Button>
      <span
        size="small"
        aria-label="close"
        color="inherit"
        onClick={handleClose}
        style={{ cursor: 'pointer' }}
      >
        <IoMdClose fontSize="small" />
      </span>
    </>
  );

  return (
    <Snackbar
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{
        content: {
        sx: {
            fontSize: '1rem',
            backgroundColor: '#333', // example background
            color: '#fff',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        },
        }}}
      open={open}
      autoHideDuration={999999}
      onClose={handleClose}
      message={message}
      action={action}
    />
  );
});

export default SimpleSnackbar;
