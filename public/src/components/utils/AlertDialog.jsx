import React, { useRef } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

// Reusable AlertDialog component
const AlertDialog = React.forwardRef((props, ref) => {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [actionTitle, setActionTitle] = React.useState('');
  const onProceedRef = React.useRef(null);
  const onCancelRef = React.useRef(null);

  const openDialog = (msg, actionTitle ,onProceed, onCancel) => {
    if (msg) setMessage(msg);
    if (actionTitle) setActionTitle(actionTitle);
    onProceedRef.current = onProceed;
    onCancelRef.current = onCancel;
    setOpen(true);
  };

  const handleCancel = () => {
    setOpen(false);
    onCancelRef.current?.();
  };

  const handleProceed = () => {
    setOpen(false);
    onProceedRef.current?.();
  };

  React.useImperativeHandle(ref, () => ({
    openDialog,
    setMessage,
  }));

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{actionTitle}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} style={{textTransform: 'none'}} >Cancel</Button>
        <Button onClick={handleProceed} style={{textTransform: 'none'}} autoFocus>
          Proceed
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default AlertDialog;
