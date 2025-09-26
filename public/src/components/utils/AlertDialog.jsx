import React, { useRef } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Slide from '@mui/material/Slide';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="left" ref={ref} {...props} />;
});

// Reusable AlertDialog component
const AlertDialog = ({ref}) => {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [btnStyle, setBtnStyle] = React.useState('');
  const [actionTitle, setActionTitle] = React.useState('');
  const onProceedRef = React.useRef(null);
  const onCancelRef = React.useRef(null);

  const openDialog = (msg, actionTitle, btnStyle, onProceed, onCancel) => {
    if (msg) setMessage(msg);
    if (btnStyle) setBtnStyle(btnStyle);
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
      TransitionComponent={Transition}
      keepMounted
    >
      <DialogTitle id="alert-dialog-title">{actionTitle}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description" sx={{color: 'black'}}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
    <Button 
      onClick={handleCancel} size='small'
      style={{ textTransform: 'none' }} 
      variant="contained"
    >
      Cancel
    </Button>
        <Button size='small'
        onClick={handleProceed} style={{ textTransform: 'none' }}  variant="outlined" color={btnStyle.color}>
          {btnStyle.text}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AlertDialog;
